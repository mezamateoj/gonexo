import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { driverDocument, driverProfile, review, user as userTable } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { badRequest, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { enrichVehicle } from "../ai/vehicle-enrichment";
import { logger } from "../lib/logger";
import { normalizePhone, normalizeVehiclePlate } from "../lib/normalizers";
import { containsContactInfo, NO_CONTACT_MESSAGE } from "../lib/content-safety";
import { throwConflictOnUniqueConstraint } from "../lib/database-errors";
import { enforceRateLimit } from "../lib/rate-limit";
import { getOwnedUpload, requireOwnedUpload } from "../lib/uploads";

const drivers = new Hono<AppEnv>();

const uploadKeySchema = z.string().min(1).max(100).refine(
  (key) => !key.includes("://"),
  "R2 object key required",
);

const documentSchema = z.object({
  key: uploadKeySchema,
  order: z.number().int().min(0).default(0),
});

const verificationDocumentSchema = documentSchema.extend({
  kind: z.enum(["license", "papers"]),
});

const vehiclePhotoSchema = documentSchema.extend({
  kind: z.literal("vehicle_photo"),
});

const upsertDriverSchema = z.object({
  phone: z.string().min(8),
  vehicleType: z.enum(["van", "pickup", "truck_small", "truck_large"]),
  vehiclePlate: z.string().min(4).max(10).toUpperCase(),
  vehicleYear: z.number().int().min(1990).max(2030).optional(),
  bio: z.string().max(500).optional(),
  documents: z.array(verificationDocumentSchema).optional(),
  vehicleDescription: z.string().max(500).optional(),
  vehicleCapacity: z.string().max(200).optional(),
});

const replaceDocumentsSchema = z.object({
  documents: z.array(verificationDocumentSchema).max(12),
});

const replacePhotosSchema = z.object({
  photos: z.array(vehiclePhotoSchema).max(8),
});

const enrichSchema = z.object({
  photoKeys: z.array(uploadKeySchema).min(1).max(4),
  papersKey: uploadKeySchema.optional(),
});

drivers.get("/me", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.userId, user.id),
    with: { documents: { orderBy: [asc(driverDocument.order)] } },
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

    if (body.documents) {
      await Promise.all(
        body.documents.map(({ key }) => requireOwnedUpload(c.env.BUCKET, key, user.id)),
      );
    }

    const existing = await db.query.driverProfile.findFirst({
      where: eq(driverProfile.userId, user.id),
    });

    const documentsChanged = body.documents !== undefined;
    const hasDocuments = !!body.documents?.length;
    const vehicleChanged = !!existing && (
      existing.vehicleType !== body.vehicleType || existing.vehiclePlate !== vehiclePlate
    );
    const hasExistingVerificationDocuments = existing && await db.query.driverDocument.findFirst({
      where: and(
        eq(driverDocument.driverProfileId, existing.id),
        ne(driverDocument.kind, "vehicle_photo"),
      ),
      columns: { id: true },
    });
    // Papers are cross-checked against the vehicle, so a plate or type change
    // requires the same human re-review as replacing the documents.
    const verificationChanged = documentsChanged || vehicleChanged;
    const currentStatus = existing?.documentsStatus ?? "pending";
    const documentsStatus = documentsChanged
      ? hasDocuments ? "submitted" : "pending"
      : vehicleChanged && hasExistingVerificationDocuments ? "submitted" : currentStatus;
    if (existing) {
      const updateUser = db
        .update(userTable)
        .set({ phone })
        .where(eq(userTable.id, user.id));
      const updateProfile = db
        .update(driverProfile)
        .set({
          phone,
          vehicleType: body.vehicleType,
          vehiclePlate,
          vehicleYear: body.vehicleYear ?? null,
          bio: body.bio ?? null,
          vehicleDescription: body.vehicleDescription ?? existing.vehicleDescription,
          vehicleCapacity: body.vehicleCapacity ?? existing.vehicleCapacity,
          documentsStatus,
          isVerified: verificationChanged ? false : existing.isVerified,
        })
        .where(eq(driverProfile.userId, user.id));

      try {
        if (body.documents?.length) {
          const replaceDocuments = db
            .delete(driverDocument)
            .where(and(
              eq(driverDocument.driverProfileId, existing.id),
              ne(driverDocument.kind, "vehicle_photo"),
            ));
          const insertDocuments = db.insert(driverDocument).values(
            body.documents.map((document) => ({
              id: crypto.randomUUID(),
              driverProfileId: existing.id,
              kind: document.kind,
              key: document.key,
              order: document.order,
            })),
          );
          await db.batch([updateUser, updateProfile, replaceDocuments, insertDocuments]);
        } else if (body.documents) {
          await db.batch([
            updateUser,
            updateProfile,
            db.delete(driverDocument).where(and(
              eq(driverDocument.driverProfileId, existing.id),
              ne(driverDocument.kind, "vehicle_photo"),
            )),
          ]);
        } else {
          await db.batch([updateUser, updateProfile]);
        }
      } catch (error) {
        throwConflictOnUniqueConstraint(error, "Phone number or vehicle plate is already in use");
      }
      logger.info("Driver profile updated: {userId} ({vehicleType} {vehiclePlate}, docs: {documentsStatus})", {
        userId: user.id,
        vehicleType: body.vehicleType,
        vehiclePlate,
        documentsStatus,
      });
      return c.json({ id: existing.id });
    }

    const id = crypto.randomUUID();
    const updateUser = db
      .update(userTable)
      .set({ phone })
      .where(eq(userTable.id, user.id));
    const insertProfile = db.insert(driverProfile).values({
        id,
        userId: user.id,
        phone,
        vehicleType: body.vehicleType,
        vehiclePlate,
        vehicleYear: body.vehicleYear ?? null,
        bio: body.bio ?? null,
        vehicleDescription: body.vehicleDescription ?? null,
        vehicleCapacity: body.vehicleCapacity ?? null,
        documentsStatus,
      });
    try {
      if (body.documents?.length) {
        await db.batch([
        updateUser,
        insertProfile,
        db.insert(driverDocument).values(
          body.documents.map((document) => ({
            id: crypto.randomUUID(),
            driverProfileId: id,
            kind: document.kind,
            key: document.key,
            order: document.order,
          })),
        ),
        ]);
      } else {
        await db.batch([updateUser, insertProfile]);
      }
    } catch (error) {
      throwConflictOnUniqueConstraint(error, "Phone number or vehicle plate is already in use");
    }
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

drivers.get("/me/documents", requireAuth, async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.userId, user.id),
    columns: { id: true },
  });
  if (!profile) throw notFound("Driver profile not found");

  const documents = await db.query.driverDocument.findMany({
    where: eq(driverDocument.driverProfileId, profile.id),
    orderBy: [asc(driverDocument.order)],
  });
  return c.json(documents);
});

drivers.put(
  "/me/documents",
  requireAuth,
  zValidator("json", replaceDocumentsSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user")!;
    const { documents } = c.req.valid("json");
    await Promise.all(
      documents.map(({ key }) => requireOwnedUpload(c.env.BUCKET, key, user.id)),
    );
    const profile = await db.query.driverProfile.findFirst({
      where: eq(driverProfile.userId, user.id),
      columns: { id: true },
    });
    if (!profile) throw notFound("Driver profile not found");

    const replaceDocuments = db
      .delete(driverDocument)
      .where(and(
        eq(driverDocument.driverProfileId, profile.id),
        ne(driverDocument.kind, "vehicle_photo"),
      ));
    const updateProfile = db
      .update(driverProfile)
      .set({
        documentsStatus: documents.length > 0 ? "submitted" : "pending",
        isVerified: false,
      })
      .where(eq(driverProfile.id, profile.id));

    try {
      if (documents.length > 0) {
        await db.batch([
        replaceDocuments,
        db.insert(driverDocument).values(
          documents.map((document) => ({
            id: crypto.randomUUID(),
            driverProfileId: profile.id,
            kind: document.kind,
            key: document.key,
            order: document.order,
          })),
        ),
        updateProfile,
        ]);
      } else {
        await db.batch([replaceDocuments, updateProfile]);
      }
    } catch (error) {
      throwConflictOnUniqueConstraint(error, "A document is already in use");
    }

    return c.json({ ok: true });
  },
);

drivers.put("/me/photos", requireAuth, zValidator("json", replacePhotosSchema), async (c) => {
  const db = c.get("db");
  const user = c.get("user")!;
  const { photos } = c.req.valid("json");
  await Promise.all(
    photos.map(({ key }) => requireOwnedUpload(c.env.BUCKET, key, user.id)),
  );
  const profile = await db.query.driverProfile.findFirst({ where: eq(driverProfile.userId, user.id), columns: { id: true } });
  if (!profile) throw notFound("Driver profile not found");

  await db.batch([
    db.delete(driverDocument).where(and(eq(driverDocument.driverProfileId, profile.id), eq(driverDocument.kind, "vehicle_photo"))),
    ...(photos.length ? [db.insert(driverDocument).values(photos.map((photo) => ({ id: crypto.randomUUID(), driverProfileId: profile.id, ...photo })))] : []),
  ]);
  return c.json({ ok: true });
});

drivers.post(
  "/enrich",
  requireAuth,
  zValidator("json", enrichSchema),
  async (c) => {
    const user = c.get("user")!;
    await enforceRateLimit(
      c.env.AI_RATE_LIMITER,
      `${user.id}:drivers-enrich`,
      "Too many vehicle enrichment requests",
    );
    const { photoKeys, papersKey } = c.req.valid("json");
    const photoObjects = await Promise.all(
      photoKeys.map((key) => getOwnedUpload(c.env.BUCKET, key, user.id)),
    );
    const papersObject = papersKey
      ? await getOwnedUpload(c.env.BUCKET, papersKey, user.id)
      : null;
    const [photos, papers] = await Promise.all([
      Promise.all(photoObjects.map((object) => object.arrayBuffer())),
      papersObject ? papersObject.arrayBuffer() : null,
    ]);
    const apiKey = c.env.ANTHROPIC_API_KEY;
    logger.debug("Vehicle enrichment started for user {userId} ({photoCount} photos)", {
      userId: user.id,
      photoCount: photoKeys.length,
      hasPapers: !!papersKey,
    });
    const result = await enrichVehicle(photos, papers, apiKey);
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
      documents: {
        where: eq(driverDocument.kind, "vehicle_photo"),
        orderBy: [asc(driverDocument.order)],
        columns: { key: true, order: true },
      },
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

  const { userId: _userId, documents, ...publicProfile } = profile;
  return c.json({ ...publicProfile, vehiclePhotos: documents, recentReviews });
});

export type DriversType = typeof drivers;
export default drivers;
