import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { driverProfile, review } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/types";

const drivers = new Hono<AppEnv>();

const upsertDriverSchema = z.object({
  phone: z.string().min(8),
  vehicleType: z.enum(["van", "pickup", "truck_small", "truck_large"]),
  vehiclePlate: z.string().min(4).max(10).toUpperCase(),
  vehicleYear: z.number().int().min(1990).max(2030).optional(),
  bio: z.string().max(500).optional(),
});

drivers.get("/me", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.userId, user.id),
  });
  return c.json(profile ?? null);
});

drivers.post(
  "/me",
  requireAuth,
  zValidator("json", upsertDriverSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const body = c.req.valid("json");

    const existing = await db.query.driverProfile.findFirst({
      where: eq(driverProfile.userId, user.id),
    });

    if (existing) {
      await db
        .update(driverProfile)
        .set({
          phone: body.phone,
          vehicleType: body.vehicleType,
          vehiclePlate: body.vehiclePlate,
          vehicleYear: body.vehicleYear ?? null,
          bio: body.bio ?? null,
        })
        .where(eq(driverProfile.userId, user.id));
      return c.json({ id: existing.id });
    }

    const id = crypto.randomUUID();
    await db.insert(driverProfile).values({
      id,
      userId: user.id,
      phone: body.phone,
      vehicleType: body.vehicleType,
      vehiclePlate: body.vehiclePlate,
      vehicleYear: body.vehicleYear ?? null,
      bio: body.bio ?? null,
    });
    return c.json({ id }, 201);
  }
);

drivers.get("/:id", async (c) => {
  const db = c.get("db");
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.id, c.req.param("id")),
    with: {
      user: { columns: { id: true, name: true, image: true } },
    },
  });
  if (!profile) return c.json({ error: "Not found" }, 404);

  const recentReviews = await db.query.review.findMany({
    where: eq(review.revieweeId, profile.userId),
    orderBy: [desc(review.createdAt)],
    limit: 10,
    with: {
      reviewer: { columns: { name: true, image: true } },
    },
  });

  return c.json({ ...profile, recentReviews });
});

export type DriversType = typeof drivers;
export default drivers;
