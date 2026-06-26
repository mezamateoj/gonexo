import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { driverProfile, review } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/types";
import { enrichVehicle } from "../ai/vehicle-enrichment";

const drivers = new Hono<AppEnv>();

const upsertDriverSchema = z.object({
  phone: z.string().min(8),
  vehicleType: z.enum(["van", "pickup", "truck_small", "truck_large"]),
  vehiclePlate: z.string().min(4).max(10).toUpperCase(),
  vehicleYear: z.number().int().min(1990).max(2030).optional(),
  bio: z.string().max(500).optional(),
  licenseUrl: z.string().url().optional(),
  vehiclePhotos: z.array(z.string().url()).optional(),
  papersUrl: z.string().url().optional(),
  vehicleDescription: z.string().max(500).optional(),
  vehicleCapacity: z.string().max(200).optional(),
});

const enrichSchema = z.object({
  photoUrls: z.array(z.string().url()).min(1),
  papersUrl: z.string().url().optional(),
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

    const hasDocuments = !!(body.licenseUrl || body.vehiclePhotos?.length || body.papersUrl);
    const documentsStatus = hasDocuments ? "submitted" : "pending";
    const vehiclePhotosJson = body.vehiclePhotos ? JSON.stringify(body.vehiclePhotos) : null;

    if (existing) {
      await db
        .update(driverProfile)
        .set({
          phone: body.phone,
          vehicleType: body.vehicleType,
          vehiclePlate: body.vehiclePlate,
          vehicleYear: body.vehicleYear ?? null,
          bio: body.bio ?? null,
          licenseUrl: body.licenseUrl ?? null,
          vehiclePhotos: vehiclePhotosJson,
          papersUrl: body.papersUrl ?? null,
          vehicleDescription: body.vehicleDescription ?? null,
          vehicleCapacity: body.vehicleCapacity ?? null,
          documentsStatus,
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
      licenseUrl: body.licenseUrl ?? null,
      vehiclePhotos: vehiclePhotosJson,
      papersUrl: body.papersUrl ?? null,
      vehicleDescription: body.vehicleDescription ?? null,
      vehicleCapacity: body.vehicleCapacity ?? null,
      documentsStatus,
    });
    return c.json({ id }, 201);
  }
);

drivers.post(
  "/enrich",
  requireAuth,
  zValidator("json", enrichSchema),
  async (c) => {
    const { photoUrls, papersUrl } = c.req.valid("json");
    const apiKey = c.env.ANTHROPIC_API_KEY;
    const result = await enrichVehicle(photoUrls, papersUrl ?? null, apiKey);
    return c.json(result);
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
