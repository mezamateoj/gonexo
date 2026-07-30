import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, ne, or, asc, desc, like, inArray, exists, count, gt, isNull, isNotNull, sql, type SQL } from "drizzle-orm";
import { request, requestPhoto, quote, driverProfile, user as userTable, job } from "../db/schema";
import { requireAuth, requireClient, requireDriver } from "../middleware/auth";
import { badRequest, conflict, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { logger } from "../lib/logger";
import {
  computePriceRange,
  haversineKm,
  CIRCUITY_FACTOR,
  PLATFORM_FEE_RATE,
  quoteAcceptableWindow,
  type PriceRange,
  type VolumeCategory,
} from "../lib/pricing";
import { mapboxDirections } from "../lib/directions";
import { maskAddress } from "../lib/address";
import { containsContactInfo, NO_CONTACT_MESSAGE } from "../lib/content-safety";
import { newQuoteEmail, sendEmail } from "../lib/email";
import { notifyAvailableDrivers, republishRequest } from "../workflows/requests";

const requests = new Hono<AppEnv>();

// Display distance without exposing exact coordinates: real road distance when
// Mapbox resolved it, else straight-line from the (server-side only) coords.
function displayDistanceKm(req: typeof request.$inferSelect): number {
  const km =
    req.routeDistanceM != null
      ? req.routeDistanceM / 1000
      : haversineKm(req.originLat, req.originLng, req.destLat, req.destLng);
  return Math.round(km * 10) / 10;
}

// Fair-price band for a request row. Uses real road distance when stored, else
// haversine inflated for circuity. Shared by the price-range endpoint and the
// quote-validation guard so they can never diverge.
function fairPriceRange(req: typeof request.$inferSelect): PriceRange {
  const distanceKm =
    req.routeDistanceM != null
      ? req.routeDistanceM / 1000
      : haversineKm(req.originLat, req.originLng, req.destLat, req.destLng) *
        CIRCUITY_FACTOR;

  return computePriceRange({
    volumeCategory: req.volumeCategory as VolumeCategory,
    distanceKm,
    originFloor: req.originFloor,
    originHasElevator: req.originHasElevator,
    destFloor: req.destFloor,
    destHasElevator: req.destHasElevator,
    longCarry: req.longCarry,
    helpersNeeded: req.helpersNeeded,
    assemblyRequired: req.assemblyRequired,
    packingIncluded: req.packingIncluded,
    hasFragileItems: req.hasFragileItems,
    scheduledAt: req.scheduledAt,
  });
}

const createRequestSchema = z.object({
  originAddress: z.string().min(1),
  originLat: z.number(),
  originLng: z.number(),
  originFloor: z.number().int().optional(),
  originHasElevator: z.boolean().default(false),
  destAddress: z.string().min(1),
  destLat: z.number(),
  destLng: z.number(),
  destFloor: z.number().int().optional(),
  destHasElevator: z.boolean().default(false),
  scheduledAt: z.string().datetime(),
  flexibleDate: z.boolean().default(false),
  volumeCategory: z.enum(["small", "medium", "large", "full_move"]),
  itemDescription: z.string().min(1),
  notes: z.string().optional(),
  photoUrls: z.array(z.string().url()).max(8).default([]),
  budgetMax: z.number().int().positive().optional(),
  helpersNeeded: z.number().int().min(0).max(3).default(0),
  hasFragileItems: z.boolean().default(false),
  assemblyRequired: z.boolean().default(false),
  packingIncluded: z.boolean().default(false),
  parkingType: z.enum(["street", "garage", "loading_dock"]).default("street"),
  longCarry: z.boolean().default(false),
});

requests.post(
  "/",
  requireClient,
  zValidator("json", createRequestSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const body = c.req.valid("json");
    if (new Date(body.scheduledAt).getTime() < Date.now() - 5 * 60 * 1000) {
      throw badRequest("La fecha programada no puede estar en el pasado");
    }
    if (
      body.originLat < -90 || body.originLat > 90 ||
      body.originLng < -180 || body.originLng > 180 ||
      (body.originLat === 0 && body.originLng === 0)
    ) {
      throw badRequest("Las coordenadas de origen no son válidas");
    }
    if (
      body.destLat < -90 || body.destLat > 90 ||
      body.destLng < -180 || body.destLng > 180 ||
      (body.destLat === 0 && body.destLng === 0)
    ) {
      throw badRequest("Las coordenadas de destino no son válidas");
    }
    if (containsContactInfo(body.notes)) throw badRequest(NO_CONTACT_MESSAGE);
    const id = crypto.randomUUID();

    // Resolve the real driving route once (immutable for a request). Null if
    // Mapbox is unavailable — pricing then falls back to haversine.
    const route = await mapboxDirections(
      c.env.MAPBOX_TOKEN,
      { lat: body.originLat, lng: body.originLng },
      { lat: body.destLat, lng: body.destLng },
    );

    const insertRequest = db.insert(request).values({
      id,
      userId: user.id,
      routeDistanceM: route?.distanceM ?? null,
      routeDurationS: route?.durationS ?? null,
      originAddress: body.originAddress,
      originLat: body.originLat,
      originLng: body.originLng,
      originFloor: body.originFloor ?? null,
      originHasElevator: body.originHasElevator,
      destAddress: body.destAddress,
      destLat: body.destLat,
      destLng: body.destLng,
      destFloor: body.destFloor ?? null,
      destHasElevator: body.destHasElevator,
      scheduledAt: new Date(body.scheduledAt),
      flexibleDate: body.flexibleDate,
      volumeCategory: body.volumeCategory,
      itemDescription: body.itemDescription,
      notes: body.notes ?? null,
      budgetMax: body.budgetMax ?? null,
      helpersNeeded: body.helpersNeeded,
      hasFragileItems: body.hasFragileItems,
      assemblyRequired: body.assemblyRequired,
      packingIncluded: body.packingIncluded,
      parkingType: body.parkingType,
      longCarry: body.longCarry,
    });

    if (body.photoUrls.length > 0) {
      await db.batch([
        insertRequest,
        db.insert(requestPhoto).values(
          body.photoUrls.map((url, i) => ({
            id: crypto.randomUUID(),
            requestId: id,
            url,
            order: i,
          }))
        ),
      ]);
    } else {
      await insertRequest;
    }

    logger.info("Request created: {id} by user {userId} ({volume}, scheduled {scheduledAt})", {
      id,
      userId: user.id,
      volume: body.volumeCategory,
      scheduledAt: body.scheduledAt,
      photos: body.photoUrls.length,
    });

    c.executionCtx.waitUntil(notifyAvailableDrivers(db, c.env, {
      id,
      originAddress: body.originAddress,
      destAddress: body.destAddress,
      scheduledAt: new Date(body.scheduledAt),
    }));

    return c.json({ id }, 201);
  }
);

// Must be registered before /:id so "my" is not captured as a param.
const MY_REQUEST_BUCKETS = ["offers", "active", "history"] as const;
const myRequestBucketSet = new Set<string>(MY_REQUEST_BUCKETS);

// Sortable via table headers: scheduled date asc/desc; default is newest first.
const MY_REQUEST_SORTS = {
  recent: [desc(request.createdAt)],
  sched_asc: [asc(request.scheduledAt)],
  sched_desc: [desc(request.scheduledAt)],
} as const;
type MyRequestSort = keyof typeof MY_REQUEST_SORTS;

// Client "Mis fletes" list. Paginated per lifecycle bucket so it scales to
// hundreds of rows (never fetch the whole set to render one tab). Omitting
// `bucket` returns every request the caller owns.
requests.get("/my", requireClient, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;

  const bucket = c.req.query("bucket");
  if (bucket && !myRequestBucketSet.has(bucket)) throw badRequest("Filtro inválido");

  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query("limit") ?? "20")));
  const offset = (page - 1) * limit;

  const q = c.req.query("q")?.trim();
  const volumeParam = c.req.query("volume");
  const orderBy = MY_REQUEST_SORTS[(c.req.query("sort") ?? "recent") as MyRequestSort] ?? MY_REQUEST_SORTS.recent;

  // active/history depend on the request's live (non-cancelled) job:
  // active = still running (no confirmedAt), history = confirmed delivery.
  const hasJob = (...extra: SQL[]) =>
    exists(
      db
        .select({ x: sql`1` })
        .from(job)
        .where(and(eq(job.requestId, request.id), ...extra)),
    );

  const conditions = [eq(request.userId, user.id)];
  if (bucket === "offers") {
    conditions.push(eq(request.status, "open"));
  } else if (bucket === "active") {
    conditions.push(
      ne(request.status, "cancelled"),
      hasJob(ne(job.status, "cancelled"), isNull(job.confirmedAt)),
    );
  } else if (bucket === "history") {
    const cond = or(eq(request.status, "cancelled"), hasJob(isNotNull(job.confirmedAt)));
    if (cond) conditions.push(cond);
  }

  if (q) {
    const search = or(like(request.originAddress, `%${q}%`), like(request.destAddress, `%${q}%`));
    if (search) conditions.push(search);
  }
  if (volumeParam) {
    const volumes = volumeParam
      .split(",")
      .filter((v): v is VolumeCategory => VOLUME_CATEGORIES.includes(v as VolumeCategory));
    if (volumes.length > 0) conditions.push(inArray(request.volumeCategory, volumes));
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db.query.request.findMany({
      where,
      orderBy: [...orderBy],
      limit,
      offset,
      with: {
        photos: {
          limit: 1,
          orderBy: [asc(requestPhoto.order)],
          columns: { url: true },
        },
        quotes: { columns: { id: true, status: true, price: true } },
        jobs: {
          where: ne(job.status, "cancelled"),
          limit: 1,
          columns: { id: true, status: true, confirmedAt: true },
        },
      },
    }),
    db.select({ n: count() }).from(request).where(where),
  ]);

  const data = rows.map(({ jobs, ...req }) => ({ ...req, job: jobs[0] ?? null }));
  return c.json({ data, page, limit, total: countRows[0]?.n ?? 0 });
});

// Available-feed sort options. Only real columns are sortable so paging stays
// correct across the full set (computed values like fair price / competition
// can't be ORDER BY'd in SQL — they're per-row JS). Distance nulls sort last.
const AVAILABLE_SORTS = {
  recent: [desc(request.createdAt)],
  soonest: [asc(request.scheduledAt)],
  distance: [sql`${request.routeDistanceM} is null`, asc(request.routeDistanceM)],
} as const;
type AvailableSort = keyof typeof AVAILABLE_SORTS;

const VOLUME_CATEGORIES: VolumeCategory[] = ["small", "medium", "large", "full_move"];

requests.get("/", requireDriver, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query("limit") ?? "20")));
  const offset = (page - 1) * limit;

  const sortKey = c.req.query("sort") ?? "recent";
  const orderBy =
    AVAILABLE_SORTS[sortKey as AvailableSort] ?? AVAILABLE_SORTS.recent;

  // Only open requests that aren't the caller's own.
  const conditions = [eq(request.status, "open"), ne(request.userId, user.id)];

  const volumeParam = c.req.query("volume");
  if (volumeParam) {
    const volumes = volumeParam
      .split(",")
      .filter((v): v is VolumeCategory => VOLUME_CATEGORIES.includes(v as VolumeCategory));
    if (volumes.length > 0) conditions.push(inArray(request.volumeCategory, volumes));
  }

  if (c.req.query("hasPhotos") === "true") {
    conditions.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(requestPhoto)
          .where(eq(requestPhoto.requestId, request.id)),
      ),
    );
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db.query.request.findMany({
      where,
      orderBy: [...orderBy],
      limit,
      offset,
      with: {
        photos: { orderBy: [asc(requestPhoto.order)], columns: { url: true } },
        user: { columns: { name: true, image: true } },
        quotes: {
          columns: { id: true, driverId: true, status: true },
        },
      },
    }),
    db.select({ n: count() }).from(request).where(where),
  ]);

  // Browsing drivers see only the zone + a distance, never the exact address or
  // coordinates. Fair price is included so they can gauge earnings from the feed.
  const data = rows.map(({ quotes, ...r }) => ({
    ...r,
    quotes: quotes.map(({ id }) => ({ id })),
    quoteCount: quotes.length,
    myQuoteStatus:
      quotes.find((item) => item.driverId === user.id)?.status ?? null,
    originAddress: maskAddress(r.originAddress),
    destAddress: maskAddress(r.destAddress),
    originLat: null,
    originLng: null,
    destLat: null,
    destLng: null,
    distanceKm: displayDistanceKm(r),
    fairPrice: fairPriceRange(r).mid,
  }));

  return c.json({ data, page, limit, total: countRows[0]?.n ?? 0 });
});

requests.get("/:id", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const result = await db.query.request.findFirst({
    where: eq(request.id, c.req.param("id")),
    with: {
      photos: { orderBy: [asc(requestPhoto.order)] },
      user: { columns: { id: true, name: true, image: true, phone: true } },
      originalRequest: { columns: { id: true } },
      republishedRequests: {
        columns: { id: true, scheduledAt: true },
        limit: 1,
      },
      jobs: {
        where: ne(job.status, "cancelled"),
        limit: 1,
          columns: { id: true, status: true, driverId: true, confirmedAt: true },
      },
    },
  });

  if (!result) throw notFound();

  const isOwner = result.userId === user.id;
  const activeJob = result.jobs[0] ?? null;
  const driverAccess = isOwner
    ? null
    : await Promise.all([
        db.query.driverProfile.findFirst({
          where: eq(driverProfile.userId, user.id),
          columns: { id: true },
        }),
        db.query.quote.findFirst({
          where: and(eq(quote.requestId, result.id), eq(quote.driverId, user.id)),
          columns: {
            id: true,
            price: true,
            message: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);
  const myQuote = driverAccess?.[1] ?? null;

  // Access control: owners see their own request; everyone else must be a
  // driver, and may only inspect open requests or ones they personally quoted.
  // Hide existence (404) from anyone else rather than leaking it via 403.
  if (!isOwner && (!driverAccess?.[0] || (result.status !== "open" && !myQuote)))
    throw notFound();

  const now = new Date();
  const [quoteCountRows, activeQuoteCountRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(quote)
      .where(eq(quote.requestId, result.id)),
    db
      .select({ n: count() })
      .from(quote)
      .where(and(
        eq(quote.requestId, result.id),
        eq(quote.status, "pending"),
        gt(quote.expiresAt, now),
      )),
  ]);
  const quoteCount = quoteCountRows[0]?.n ?? 0;
  const activeQuoteCount = activeQuoteCountRows[0]?.n ?? 0;
  const rescueState = result.status !== "open"
    ? null
    : activeQuoteCount > 0
      ? "offers_available"
      : quoteCount > 0
        ? "offers_expired"
        : result.zeroQuoteNotifiedAt || result.createdAt <= new Date(now.getTime() - 24 * 60 * 60 * 1000)
          ? "needs_rescue"
          : "waiting";

  // Exact address + coords are revealed only to the owner and the matched driver
  // (once their quote is accepted). Everyone else sees the masked zone.
  const isMatchedDriver = !!activeJob && activeJob.driverId === user.id;
  const canSeeExact = isOwner || isMatchedDriver;

  return c.json({
    ...result,
    originAddress: canSeeExact ? result.originAddress : maskAddress(result.originAddress),
    destAddress: canSeeExact ? result.destAddress : maskAddress(result.destAddress),
    originLat: canSeeExact ? result.originLat : null,
    originLng: canSeeExact ? result.originLng : null,
    destLat: canSeeExact ? result.destLat : null,
    destLng: canSeeExact ? result.destLng : null,
    distanceKm: displayDistanceKm(result),
    // Client phone is exchanged on job detail only, never on request detail.
    user: { ...result.user, phone: isOwner ? result.user.phone : null },
    myQuote,
    quoteCount,
    activeQuoteCount,
    rescueState,
    republishedFrom: result.originalRequest,
    republishedAs: result.republishedRequests[0] ?? null,
    zeroQuoteNotifiedAt: undefined,
    expiryRemindNotifiedAt: undefined,
    adminNoQuoteNotifiedAt: undefined,
    adminExpiryNotifiedAt: undefined,
    republishedFromId: undefined,
    // driverId used only for the reveal check above — not exposed.
    jobs: undefined,
    originalRequest: undefined,
    republishedRequests: undefined,
    job: activeJob
      ? { id: activeJob.id, status: activeJob.status, confirmedAt: activeJob.confirmedAt }
      : null,
  });
});

requests.get("/:id/quotes", requireClient, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const requestId = c.req.param("id");

  const ownedRequest = await db.query.request.findFirst({
    where: and(eq(request.id, requestId), eq(request.userId, user.id)),
    columns: { id: true },
  });
  if (!ownedRequest) throw notFound();

  const quotes = await db.query.quote.findMany({
    where: eq(quote.requestId, requestId),
    columns: {
      id: true,
      driverId: true,
      price: true,
      message: true,
      status: true,
      createdAt: true,
    },
    with: {
      driver: {
        columns: { id: true, name: true, image: true },
        with: {
          driverProfile: {
            columns: {
              id: true,
              vehicleType: true,
              vehicleDescription: true,
              vehicleCapacity: true,
              isVerified: true,
              documentsStatus: true,
              avgRating: true,
              totalJobs: true,
              bio: true,
            },
          },
        },
      },
    },
    orderBy: [asc(quote.price)],
  });

  return c.json({ count: quotes.length, quotes });
});

// Advisory fair-price band for a driver while the request is open or after they
// quoted it. Anyone else gets 404 rather than leaking request details.
requests.get("/:id/price-range", requireDriver, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const req = await db.query.request.findFirst({
    where: eq(request.id, c.req.param("id")),
  });
  if (!req) throw notFound();

  if (req.status !== "open") {
    const myQuote = await db.query.quote.findFirst({
      where: and(eq(quote.requestId, req.id), eq(quote.driverId, user.id)),
      columns: { id: true },
    });
    if (!myQuote) throw notFound();
  }

  const fair = fairPriceRange(req);
  const acceptable = quoteAcceptableWindow(fair);

  return c.json({
    min: fair.min,
    mid: fair.mid,
    max: fair.max,
    acceptableMin: acceptable.min,
    acceptableMax: acceptable.max,
    distanceKm: fair.distanceKm,
    distanceSource: req.routeDistanceM != null ? "mapbox" : "haversine",
    durationS: req.routeDurationS,
    feeRate: PLATFORM_FEE_RATE,
  });
});

const createQuoteSchema = z.object({
  price: z.number().int().positive(),
  message: z.string().max(500).optional(),
});

requests.post(
  "/:id/quotes",
  requireDriver,
  zValidator("json", createQuoteSchema),
  async (c) => {
    const db = c.get("db");
    const driver = c.get("user")!;
    const body = c.req.valid("json");
    const requestId = c.req.param("id");

    const req = await db.query.request.findFirst({
      where: and(eq(request.id, requestId), eq(request.status, "open")),
    });
    if (!req) throw notFound("Request not found or not open");
    if (req.userId === driver.id)
      throw badRequest("Cannot quote your own request");
    if (containsContactInfo(body.message)) throw badRequest(NO_CONTACT_MESSAGE);

    // Reject quotes absurdly outside the advisory fair band (typos, wild
    // lowballs, gouging). The window is wide on purpose — the band is guidance.
    const fair = fairPriceRange(req);
    const { min: floor, max: ceiling } = quoteAcceptableWindow(fair);
    if (body.price < floor || body.price > ceiling) {
      throw badRequest(
        `Tu oferta está fuera del rango permitido (${floor.toLocaleString("es-CL")}–${ceiling.toLocaleString("es-CL")} CLP para esta solicitud).`,
      );
    }

    const id = crypto.randomUUID();
    try {
      await db.insert(quote).values({
        id,
        requestId,
        driverId: driver.id,
        price: body.price,
        message: body.message ?? null,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
    } catch (err) {
      // quote_request_driver_unique: one quote per driver per request. Drizzle
      // wraps the D1 error as DrizzleQueryError, whose own .message is just
      // "Failed query: ..." — the SQLite detail lives one level down in .cause.
      const messages = [err, (err as { cause?: unknown })?.cause]
        .filter((e): e is { message: unknown } => !!e && typeof e === "object" && "message" in e)
        .map((e) => String(e.message));
      if (messages.some((m) => /UNIQUE constraint failed/i.test(m))) {
        throw conflict("You have already quoted this request");
      }
      throw err;
    }

    logger.info("Quote submitted: {id} on request {requestId} by driver {driverId} for {price}", {
      id,
      requestId,
      driverId: driver.id,
      price: body.price,
    });

    c.executionCtx.waitUntil(
      (async () => {
        const owner = await db.query.user.findFirst({
          where: eq(userTable.id, req.userId),
          columns: { name: true, email: true },
        });
        if (!owner) return;
        await sendEmail(c.env, owner.email, newQuoteEmail({
          clientName: owner.name,
          origin: req.originAddress,
          dest: req.destAddress,
          price: body.price,
          requestId,
          frontendUrl: c.env.FRONTEND_URL,
        }));
      })(),
    );

    return c.json({ id }, 201);
  }
);

requests.patch("/:id/cancel", requireClient, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;

  const req = await db.query.request.findFirst({
    where: and(eq(request.id, c.req.param("id")), eq(request.userId, user.id)),
  });
  if (!req) throw notFound();
  if (req.status !== "open")
    throw conflict("Only open requests can be cancelled");

  await db.batch([
    db
      .update(request)
      .set({ status: "cancelled" })
      .where(eq(request.id, req.id)),
    db
      .update(quote)
      .set({ status: "cancelled" })
      .where(and(eq(quote.requestId, req.id), eq(quote.status, "pending"))),
  ]);

  logger.info("Request cancelled: {requestId} by user {userId}", {
    requestId: req.id,
    userId: user.id,
  });
  return c.json({ ok: true });
});

const republishRequestSchema = z.object({
  scheduledAt: z.string().datetime(),
  flexibleDate: z.boolean().default(false),
});

requests.post(
  "/:id/republish",
  requireClient,
  zValidator("json", republishRequestSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const body = c.req.valid("json");
    const scheduledAt = new Date(body.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw badRequest("La nueva fecha debe estar en el futuro");
    }

    const republished = await republishRequest(
      db,
      user.id,
      c.req.param("id"),
      scheduledAt,
      body.flexibleDate,
    );

    c.executionCtx.waitUntil(notifyAvailableDrivers(db, c.env, republished));
    return c.json({ id: republished.id }, 201);
  },
);

requests.patch("/:id/reopen", requireClient, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const requestId = c.req.param("id");

  const req = await db.query.request.findFirst({
    where: and(eq(request.id, requestId), eq(request.userId, user.id)),
    columns: { id: true, status: true },
    with: {
      republishedRequests: {
        columns: { id: true },
        limit: 1,
      },
    },
  });
  if (!req) throw notFound();
  if (req.status !== "cancelled") throw conflict("Only cancelled requests can be reopened");
  if (req.republishedRequests.length > 0) {
    throw conflict("Republished requests cannot be reopened");
  }

  const activeJob = await db.query.job.findFirst({
    where: and(eq(job.requestId, requestId), ne(job.status, "cancelled")),
    columns: { id: true },
  });
  if (activeJob) throw conflict("Request has an active job");

  const now = new Date();
  await db.batch([
    db
      .update(request)
      .set({ status: "open" })
      .where(eq(request.id, req.id)),
    db
      .update(quote)
      .set({ status: "pending" })
      .where(and(
        eq(quote.requestId, req.id),
        inArray(quote.status, ["cancelled", "rejected"]),
        sql`${quote.expiresAt} > ${now}`,
        sql`not exists (
          select 1 from ${job}
          where ${job.quoteId} = ${quote.id}
        )`,
      )),
  ]);

  logger.info("Request reopened: {requestId} by user {userId}", {
    requestId: req.id,
    userId: user.id,
  });
  return c.json({ ok: true });
});

export type RequestsType = typeof requests;
export default requests;
