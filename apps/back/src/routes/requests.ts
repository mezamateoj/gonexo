import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, ne, asc, desc } from "drizzle-orm";
import { request, requestPhoto, quote, driverProfile } from "../db/schema";
import { requireAuth, requireDriver } from "../middleware/auth";
import { badRequest, conflict, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { logger } from "../lib/logger";
import {
  computePriceRange,
  haversineKm,
  CIRCUITY_FACTOR,
  QUOTE_FLOOR_FACTOR,
  QUOTE_CEILING_FACTOR,
  type PriceRange,
  type VolumeCategory,
} from "../lib/pricing";
import { mapboxDirections } from "../lib/directions";

const requests = new Hono<AppEnv>();

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
      quotes: { columns: { id: true, status: true, price: true } },
      job: { columns: { id: true, status: true } },
    },
  });

  return c.json(results);
});

requests.get("/", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"));
  const limit = Math.min(50, parseInt(c.req.query("limit") ?? "20"));
  const offset = (page - 1) * limit;

  const results = await db.query.request.findMany({
    where: and(eq(request.status, "open"), ne(request.userId, user.id)),
    orderBy: [asc(request.scheduledAt)],
    limit,
    offset,
    with: {
      photos: {
        limit: 1,
        orderBy: [asc(requestPhoto.order)],
        columns: { url: true },
      },
      user: { columns: { name: true, image: true } },
      quotes: { columns: { id: true } },
    },
  });

  return c.json({ data: results, page, limit });
});

requests.get("/:id", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const result = await db.query.request.findFirst({
    where: eq(request.id, c.req.param("id")),
    with: {
      photos: { orderBy: [asc(requestPhoto.order)] },
      user: { columns: { id: true, name: true, image: true, phone: true } },
      job: { columns: { id: true, status: true } },
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

  return c.json({
    ...result,
    // Client phone is exchanged on job detail only, never on request detail.
    user: { ...result.user, phone: isOwner ? result.user.phone : null },
    // Owner compares every quote; a quoting driver sees only their own.
    quotes: isOwner ? result.quotes : myQuote ? [myQuote] : [],
    quoteCount,
    job: result.job ?? null,
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

  return c.json(fairPriceRange(req));
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

    // Reject quotes absurdly outside the advisory fair band (typos, wild
    // lowballs, gouging). The window is wide on purpose — the band is guidance.
    const fair = fairPriceRange(req);
    const floor = Math.round(fair.min * QUOTE_FLOOR_FACTOR);
    const ceiling = Math.round(fair.max * QUOTE_CEILING_FACTOR);
    if (body.priceMin < floor || body.priceMax > ceiling) {
      throw badRequest(
        `Quote outside the acceptable range (${floor}–${ceiling} CLP for this request)`,
      );
    }

    // Drivers submit a min–max band; `price` is the accepted ceiling (priceMax)
    // and becomes the agreed price if the client accepts this quote.
    const price = body.priceMax;

    const id = crypto.randomUUID();
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
