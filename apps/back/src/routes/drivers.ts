import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { driverProfile, review, user as userTable } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { badRequest, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { enrichVehicle } from "../ai/vehicle-enrichment";
import { logger } from "../lib/logger";
import { normalizePhone, normalizeVehiclePlate } from "../lib/normalizers";
import { containsContactInfo, NO_CONTACT_MESSAGE } from "../lib/content-safety";

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
    if (containsContactInfo(body.bio)) throw badRequest(NO_CONTACT_MESSAGE);
    const phone = normalizePhone(body.phone);
    const vehiclePlate = normalizeVehiclePlate(body.vehiclePlate);

    const existing = await db.query.driverProfile.findFirst({
      where: eq(driverProfile.userId, user.id),
    });

    const hasDocuments = !!(
      body.licenseUrl ||
      body.vehiclePhotos?.length ||
      body.papersUrl
    );
    const documentsStatus = hasDocuments ? "submitted" : "pending";
    const vehiclePhotosJson = body.vehiclePhotos
      ? JSON.stringify(body.vehiclePhotos)
      : null;

    if (existing) {
      await db.batch([
        db
          .update(userTable)
          .set({ phone })
          .where(eq(userTable.id, user.id)),
        db
          .update(driverProfile)
          .set({
            phone,
            vehicleType: body.vehicleType,
            vehiclePlate,
            vehicleYear: body.vehicleYear ?? null,
            bio: body.bio ?? null,
            licenseUrl: body.licenseUrl ?? null,
            vehiclePhotos: vehiclePhotosJson,
            papersUrl: body.papersUrl ?? null,
            vehicleDescription: body.vehicleDescription ?? null,
            vehicleCapacity: body.vehicleCapacity ?? null,
            documentsStatus,
          })
          .where(eq(driverProfile.userId, user.id)),
      ]);
      logger.info("Driver profile updated: {userId} ({vehicleType} {vehiclePlate}, docs: {documentsStatus})", {
        userId: user.id,
        vehicleType: body.vehicleType,
        vehiclePlate,
        documentsStatus,
      });
      return c.json({ id: existing.id });
    }

    const id = crypto.randomUUID();
    await db.batch([
      db
        .update(userTable)
        .set({ phone })
        .where(eq(userTable.id, user.id)),
      db.insert(driverProfile).values({
        id,
        userId: user.id,
        phone,
        vehicleType: body.vehicleType,
        vehiclePlate,
        vehicleYear: body.vehicleYear ?? null,
        bio: body.bio ?? null,
        licenseUrl: body.licenseUrl ?? null,
        vehiclePhotos: vehiclePhotosJson,
        papersUrl: body.papersUrl ?? null,
        vehicleDescription: body.vehicleDescription ?? null,
        vehicleCapacity: body.vehicleCapacity ?? null,
        documentsStatus,
      }),
    ]);
    logger.info("Driver profile created: {id} for user {userId} ({vehicleType} {vehiclePlate})", {
      id,
      userId: user.id,
      vehicleType: body.vehicleType,
      vehiclePlate,
      documentsStatus,
    });
    return c.json({ id }, 201);
  },
);

drivers.post(
  "/enrich",
  requireAuth,
  zValidator("json", enrichSchema),
  async (c) => {
    const user = c.get("user")!;
    const { photoUrls, papersUrl } = c.req.valid("json");
    const apiKey = c.env.ANTHROPIC_API_KEY;
    logger.debug("Vehicle enrichment started for user {userId} ({photoCount} photos)", {
      userId: user.id,
      photoCount: photoUrls.length,
      hasPapers: !!papersUrl,
    });
    const result = await enrichVehicle(photoUrls, papersUrl ?? null, apiKey);
    logger.info("Vehicle enrichment complete for user {userId} ({attributes} attributes)", {
      userId: user.id,
      attributes: result.attributes.length,
      vehicleCapacity: result.vehicleCapacity,
    });
    return c.json(result);
  },
);

// Public driver profile. Auth-gated and projected to non-sensitive fields only —
// phone, plate, document URLs, and internal ids never leave the server here.
drivers.get("/:id", requireAuth, async (c) => {
  const db = c.get("db");
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.id, c.req.param("id")),
    columns: {
      id: true,
      userId: true, // needed to look up reviews; stripped from the response
      vehicleType: true,
      vehicleYear: true,
      bio: true,
      isVerified: true,
      documentsStatus: true,
      avgRating: true,
      totalJobs: true,
      vehicleDescription: true,
      vehicleCapacity: true,
      createdAt: true,
    },
    with: {
      user: { columns: { id: true, name: true, image: true } },
    },
  });
  if (!profile) throw notFound();

  const recentReviews = await db.query.review.findMany({
    where: eq(review.revieweeId, profile.userId),
    orderBy: [desc(review.createdAt)],
    limit: 10,
    columns: { rating: true, comment: true, reviewerRole: true, createdAt: true },
    with: {
      reviewer: { columns: { name: true, image: true } },
    },
  });

  const { userId: _userId, ...publicProfile } = profile;
  return c.json({ ...publicProfile, recentReviews });
});

export type DriversType = typeof drivers;
export default drivers;
