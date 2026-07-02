import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, ne, asc, desc, inArray, exists, count, sql } from "drizzle-orm";
import { request, requestPhoto, quote, driverProfile } from "../db/schema";
import { requireAuth, requireDriver } from "../middleware/auth";
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
  requireAuth,
  zValidator("json", createRequestSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const body = c.req.valid("json");
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
    return c.json({ id }, 201);
  }
);

// Must be registered before /:id so "my" is not captured as a param.
requests.get("/my", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;

  const results = await db.query.request.findMany({
    where: eq(request.userId, user.id),
    orderBy: [desc(request.createdAt)],
    with: {
      photos: {
        limit: 1,
        orderBy: [asc(requestPhoto.order)],
        columns: { url: true },
      },
      quotes: { columns: { id: true, status: true, price: true, priceMin: true, priceMax: true } },
      job: { columns: { id: true, status: true } },
    },
  });

  return c.json(results);
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

requests.get("/", requireAuth, async (c) => {
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
        quotes: { columns: { id: true } },
      },
    }),
    db.select({ n: count() }).from(request).where(where),
  ]);

  // Browsing drivers see only the zone + a distance, never the exact address or
  // coordinates. Fair price is included so they can gauge earnings from the feed.
  const data = rows.map((r) => ({
    ...r,
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
      job: { columns: { id: true, status: true, driverId: true } },
      quotes: {
        with: {
          driver: {
            columns: { id: true, name: true, image: true },
            // Public driver profile only — no phone, plate, docs, or photos
            with: {
              driverProfile: {
                columns: {
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
      },
    },
  });

  if (!result) throw notFound();

  const isOwner = result.userId === user.id;
  const myQuote = result.quotes.find((q) => q.driverId === user.id);

  // Access control: owners see their own request; everyone else must be a
  // driver, and may only inspect open requests or ones they personally quoted.
  // Hide existence (404) from anyone else rather than leaking it via 403.
  if (!isOwner) {
    const isDriver = !!(await db.query.driverProfile.findFirst({
      where: eq(driverProfile.userId, user.id),
      columns: { id: true },
    }));
    if (!isDriver || (result.status !== "open" && !myQuote)) throw notFound();
  }

  const quoteCount = result.quotes.length;

  // Exact address + coords are revealed only to the owner and the matched driver
  // (once their quote is accepted). Everyone else sees the masked zone.
  const isMatchedDriver = !!result.job && result.job.driverId === user.id;
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
    // Owner compares every quote; a quoting driver sees only their own.
    quotes: isOwner ? result.quotes : myQuote ? [myQuote] : [],
    quoteCount,
    // driverId used only for the reveal check above — not exposed.
    job: result.job ? { id: result.job.id, status: result.job.status } : null,
  });
});

// Advisory fair-price band for a request. Same visibility as GET /:id: the owner,
// or a driver while the request is open or one they personally quoted. Anyone
// else gets 404 rather than leaking existence.
requests.get("/:id/price-range", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const req = await db.query.request.findFirst({
    where: eq(request.id, c.req.param("id")),
  });
  if (!req) throw notFound();

  if (req.userId !== user.id) {
    const isDriver = !!(await db.query.driverProfile.findFirst({
      where: eq(driverProfile.userId, user.id),
      columns: { id: true },
    }));
    if (!isDriver) throw notFound();
    if (req.status !== "open") {
      const myQuote = await db.query.quote.findFirst({
        where: and(eq(quote.requestId, req.id), eq(quote.driverId, user.id)),
        columns: { id: true },
      });
      if (!myQuote) throw notFound();
    }
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

const createQuoteSchema = z
  .object({
    priceMin: z.number().int().positive(),
    priceMax: z.number().int().positive(),
    message: z.string().max(500).optional(),
  })
  .refine((v) => v.priceMin <= v.priceMax, {
    message: "priceMin must be ≤ priceMax",
    path: ["priceMax"],
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
    if (body.priceMin < floor || body.priceMax > ceiling) {
      throw badRequest(
        `Tu cotización está fuera del rango permitido (${floor.toLocaleString("es-CL")}–${ceiling.toLocaleString("es-CL")} CLP para esta solicitud).`,
      );
    }

    // Drivers submit a min–max band; `price` is the accepted ceiling (priceMax)
    // and becomes the agreed price if the client accepts this quote.
    const price = body.priceMax;

    const id = crypto.randomUUID();
    try {
      await db.insert(quote).values({
        id,
        requestId,
        driverId: driver.id,
        price,
        priceMin: body.priceMin,
        priceMax: body.priceMax,
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

    logger.info("Quote submitted: {id} on request {requestId} by driver {driverId} for {priceMin}-{priceMax}", {
      id,
      requestId,
      driverId: driver.id,
      priceMin: body.priceMin,
      priceMax: body.priceMax,
    });
    return c.json({ id }, 201);
  }
);

requests.patch("/:id/cancel", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;

  const req = await db.query.request.findFirst({
    where: and(eq(request.id, c.req.param("id")), eq(request.userId, user.id)),
  });
  if (!req) throw notFound();
  if (req.status !== "open")
    throw conflict("Only open requests can be cancelled");

  await db
    .update(request)
    .set({ status: "cancelled" })
    .where(eq(request.id, req.id));

  logger.info("Request cancelled: {requestId} by user {userId}", {
    requestId: req.id,
    userId: user.id,
  });
  return c.json({ ok: true });
});

export type RequestsType = typeof requests;
export default requests;
