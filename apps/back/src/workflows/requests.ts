import { and, eq } from "drizzle-orm";
import { driverProfile, quote, request, requestPhoto, user } from "../db/schema";
import type { Db } from "../db";
import type { Bindings } from "../binding";
import { badRequest, conflict, notFound } from "../lib/errors";
import { newRequestEmail, sendEmail } from "../lib/email";
import { maskAddress } from "../lib/address";
import { logger } from "../lib/logger";
import { throwConflictOnUniqueConstraint } from "../lib/database-errors";

type RequestBroadcast = {
  id: string;
  originAddress: string;
  destAddress: string;
  scheduledAt: Date;
};

export async function notifyAvailableDrivers(
  db: Db,
  env: Bindings,
  requestDetails: RequestBroadcast,
) {
  const drivers = await db
    .select({ email: user.email, name: user.name })
    .from(driverProfile)
    .innerJoin(user, eq(user.id, driverProfile.userId))
    .where(and(
      eq(user.accountType, "driver"),
      eq(driverProfile.isVerified, true),
      eq(driverProfile.isAvailable, true),
    ));

  await Promise.all(drivers.map((driver) =>
    sendEmail(env, driver.email, newRequestEmail({
      driverName: driver.name,
      origin: maskAddress(requestDetails.originAddress),
      dest: maskAddress(requestDetails.destAddress),
      scheduledAt: requestDetails.scheduledAt,
      requestId: requestDetails.id,
      frontendUrl: env.FRONTEND_URL,
    })),
  ));
}

export async function republishRequest(
  db: Db,
  userId: string,
  requestId: string,
  scheduledAt: Date,
  flexibleDate: boolean,
) {
  const original = await db.query.request.findFirst({
    where: and(eq(request.id, requestId), eq(request.userId, userId)),
    with: {
      photos: { orderBy: [requestPhoto.order] },
    },
  });
  if (!original) throw notFound();
  if (original.status !== "open") {
    throw conflict("Only open requests can be republished");
  }
  if (scheduledAt <= original.scheduledAt) {
    throw badRequest("La nueva fecha debe ser posterior a la fecha original");
  }

  const id = crypto.randomUUID();
  const insertRequest = db.insert(request).values({
    id,
    userId: original.userId,
    republishedFromId: original.id,
    originAddress: original.originAddress,
    originLat: original.originLat,
    originLng: original.originLng,
    originFloor: original.originFloor,
    originHasElevator: original.originHasElevator,
    destAddress: original.destAddress,
    destLat: original.destLat,
    destLng: original.destLng,
    destFloor: original.destFloor,
    destHasElevator: original.destHasElevator,
    scheduledAt,
    flexibleDate,
    volumeCategory: original.volumeCategory,
    itemDescription: original.itemDescription,
    notes: original.notes,
    budgetMax: original.budgetMax,
    helpersNeeded: original.helpersNeeded,
    hasFragileItems: original.hasFragileItems,
    assemblyRequired: original.assemblyRequired,
    packingIncluded: original.packingIncluded,
    parkingType: original.parkingType,
    longCarry: original.longCarry,
    routeDistanceM: original.routeDistanceM,
    routeDurationS: original.routeDurationS,
  });
  const closeOriginal = db
    .update(request)
    .set({ status: "cancelled" })
    .where(and(eq(request.id, original.id), eq(request.status, "open")));
  const cancelOffers = db
    .update(quote)
    .set({ status: "cancelled" })
    .where(and(eq(quote.requestId, original.id), eq(quote.status, "pending")));

  try {
    if (original.photos.length > 0) {
      await db.batch([
        closeOriginal,
        cancelOffers,
        insertRequest,
        db.insert(requestPhoto).values(
          original.photos.map((photo) => ({
            id: crypto.randomUUID(),
            requestId: id,
            url: photo.url,
            order: photo.order,
          })),
        ),
      ]);
    } else {
      await db.batch([closeOriginal, cancelOffers, insertRequest]);
    }
  } catch (error) {
    throwConflictOnUniqueConstraint(error, "Request has already been republished");
  }

  logger.info("Request {requestId} republished as {newRequestId} by user {userId}", {
    requestId: original.id,
    newRequestId: id,
    userId,
    scheduledAt,
  });

  return {
    id,
    originAddress: original.originAddress,
    destAddress: original.destAddress,
    scheduledAt,
  };
}
