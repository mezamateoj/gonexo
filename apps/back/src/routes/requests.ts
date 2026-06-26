import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, ne, asc, desc } from "drizzle-orm";
import { request, requestPhoto, quote } from "../db/schema";
import { requireAuth, requireDriver } from "../middleware/auth";
import type { AppEnv } from "../lib/types";

const requests = new Hono<AppEnv>();

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

    const insertRequest = db.insert(request).values({
      id,
      userId: user.id,
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
      quotes: {
        with: {
          driver: {
            columns: { id: true, name: true, image: true },
            with: { driverProfile: true },
          },
        },
        orderBy: [asc(quote.price)],
      },
    },
  });

  if (!result) return c.json({ error: "Not found" }, 404);

  const isOwner = result.userId === user.id;
  const matchedQuote = result.quotes.find(
    (q) => q.status === "accepted" && q.driverId === user.id,
  );
  const canSeeContact = isOwner || !!matchedQuote;
  return c.json({
    ...result,
    user: {
      ...result.user,
      phone: canSeeContact ? result.user.phone : null,
    },
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
    if (!req) return c.json({ error: "Request not found or not open" }, 404);
    if (req.userId === driver.id)
      return c.json({ error: "Cannot quote your own request" }, 400);

    const id = crypto.randomUUID();
    await db.insert(quote).values({
      id,
      requestId,
      driverId: driver.id,
      price: body.price,
      message: body.message ?? null,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
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
  if (!req) return c.json({ error: "Not found" }, 404);
  if (req.status !== "open")
    return c.json({ error: "Only open requests can be cancelled" }, 409);

  await db
    .update(request)
    .set({ status: "cancelled" })
    .where(eq(request.id, req.id));

  return c.json({ ok: true });
});

export type RequestsType = typeof requests;
export default requests;
