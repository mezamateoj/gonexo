import { and, eq, exists, getTableColumns, sql } from "drizzle-orm";
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
  scheduledAt: Date | null;
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
  scheduledAt: Date | null,
  flexibleDate: boolean,
  scheduleType: "scheduled" | "asap",
) {
  const original = await db.query.request.findFirst({
    where: and(eq(request.id, requestId), eq(request.userId, userId)),
    with: {
      photos: { orderBy: [requestPhoto.order] },
    },
  });
  if (!original) throw notFound();
  if (original.status !== "open" && !(original.status === "expired" && original.scheduleType === "asap")) {
    throw conflict("Only open or expired ASAP requests can be republished");
  }
  if (scheduledAt && original.scheduledAt && scheduledAt <= original.scheduledAt) {
    throw badRequest("La nueva fecha debe ser posterior a la fecha original");
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = scheduleType === "asap" ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null;
  const insertRequest = db.insert(request).select(
    db.select({
      ...getTableColumns(request),
      id: sql<string>`${id}`.as("id"),
      republishedFromId: request.id,
      status: sql<string>`'open'`.as("status"),
      scheduleType: sql<"scheduled" | "asap">`${scheduleType}`.as("schedule_type"),
      scheduledAt: sql<Date | null>`${scheduledAt?.getTime() ?? null}`.as("scheduled_at"),
      expiresAt: sql<Date | null>`${expiresAt?.getTime() ?? null}`.as("expires_at"),
      flexibleDate: sql<boolean>`${scheduleType === "scheduled" && flexibleDate ? 1 : 0}`.as("flexible_date"),
      zeroQuoteNotifiedAt: sql<Date | null>`null`.as("zero_quote_notified_at"),
      expiryRemindNotifiedAt: sql<Date | null>`null`.as("expiry_remind_notified_at"),
      adminNoQuoteNotifiedAt: sql<Date | null>`null`.as("admin_no_quote_notified_at"),
      adminExpiryNotifiedAt: sql<Date | null>`null`.as("admin_expiry_notified_at"),
      createdAt: sql<Date>`${now.getTime()}`.as("created_at"),
      updatedAt: sql<Date>`${now.getTime()}`.as("updated_at"),
    }).from(request).where(and(eq(request.id, original.id), eq(request.status, original.status))),
  ).returning({ id: request.id });
  const wasRepublished = exists(db.select({ id: request.id }).from(request).where(eq(request.id, id)));
  const closeOriginal = db
    .update(request)
    .set({ status: original.status === "expired" ? "expired" : "cancelled" })
    .where(and(eq(request.id, original.id), wasRepublished));
  const cancelOffers = db
    .update(quote)
    .set({ status: original.status === "expired" ? "expired" : "cancelled" })
    .where(and(eq(quote.requestId, original.id), eq(quote.status, "pending"), wasRepublished));

  try {
    const [inserted] = await db.batch([
        insertRequest,
        closeOriginal,
        cancelOffers,
        ...original.photos.map((photo) => db.insert(requestPhoto).select(
          db.select({
            id: sql<string>`${crypto.randomUUID()}`.as("id"),
            requestId: request.id,
            url: sql<string>`${photo.url}`.as("url"),
            order: sql<number>`${photo.order}`.as("order"),
            createdAt: sql<Date>`${now.getTime()}`.as("created_at"),
          }).from(request).where(eq(request.id, id)),
        )),
      ]);
    if (inserted.length === 0) {
      throw conflict("Request no longer available for republication");
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
    scheduleType,
    scheduledAt,
    expiresAt,
  };
}
