import {
  and,
  eq,
  exists,
  gt,
  isNull,
  lte,
  not,
  or,
} from "drizzle-orm";
import { driverProfile, quote, request, user } from "../db/schema";
import type { Db } from "../db";
import type { Bindings } from "../binding";
import {
  adminNoOfferRescueEmail,
  adminOffersExpiringEmail,
  clientNoOfferRescueEmail,
  clientOffersExpiringEmail,
  sendEmail,
} from "../lib/email";
import { logger } from "../lib/logger";
import { sendEmailToAdmins } from "./admin-notifications";

const HOUR_MS = 60 * 60 * 1000;
const ADMIN_NO_OFFER_AFTER_MS = 12 * HOUR_MS;
const CLIENT_NO_OFFER_AFTER_MS = 24 * HOUR_MS;
const ADMIN_EXPIRY_WINDOW_MS = 18 * HOUR_MS;
const CLIENT_EXPIRY_WINDOW_MS = 12 * HOUR_MS;
const URGENT_SCHEDULE_WINDOW_MS = 24 * HOUR_MS;

function hasActiveOffer(db: Db, now: Date) {
  return exists(
    db
      .select({ id: quote.id })
      .from(quote)
      .where(and(
        eq(quote.requestId, request.id),
        eq(quote.status, "pending"),
        gt(quote.expiresAt, now),
      )),
  );
}

function hasOfferExpiringBefore(db: Db, now: Date, deadline: Date) {
  return exists(
    db
      .select({ id: quote.id })
      .from(quote)
      .where(and(
        eq(quote.requestId, request.id),
        eq(quote.status, "pending"),
        gt(quote.expiresAt, now),
        lte(quote.expiresAt, deadline),
      )),
  );
}

async function expirePendingOffers(db: Db, now: Date) {
  const expired = await db
    .update(quote)
    .set({ status: "expired" })
    .where(and(
      eq(quote.status, "pending"),
      lte(quote.expiresAt, now),
    ))
    .returning({ id: quote.id });

  return expired.length;
}

async function notifyAdminAboutRequestsWithoutOffers(
  db: Db,
  env: Bindings,
  now: Date,
) {
  const requests = await db.query.request.findMany({
    where: and(
      eq(request.status, "open"),
      isNull(request.adminNoQuoteNotifiedAt),
      not(hasActiveOffer(db, now)),
      or(
        lte(request.createdAt, new Date(now.getTime() - ADMIN_NO_OFFER_AFTER_MS)),
        lte(request.scheduledAt, new Date(now.getTime() + URGENT_SCHEDULE_WINDOW_MS)),
      ),
    ),
    columns: {
      id: true,
      originAddress: true,
      destAddress: true,
      scheduledAt: true,
    },
    with: {
      user: { columns: { name: true, email: true, phone: true } },
    },
    limit: 50,
  });
  if (requests.length === 0) return 0;

  const availableDrivers = await db
    .select({
      name: user.name,
      email: user.email,
      userPhone: user.phone,
      profilePhone: driverProfile.phone,
    })
    .from(driverProfile)
    .innerJoin(user, eq(user.id, driverProfile.userId))
    .where(and(
      eq(user.accountType, "driver"),
      eq(driverProfile.isVerified, true),
      eq(driverProfile.isAvailable, true),
    ))
    .limit(10);
  const drivers = availableDrivers.map((driver) => ({
    name: driver.name,
    email: driver.email,
    phone: driver.userPhone ?? driver.profilePhone,
  }));

  let notified = 0;
  for (const item of requests) {
    const notifiedAdmins = await sendEmailToAdmins(db, env, adminNoOfferRescueEmail({
      client: item.user,
      drivers,
      origin: item.originAddress,
      dest: item.destAddress,
      scheduledAt: item.scheduledAt,
      requestId: item.id,
    }));
    if (notifiedAdmins === 0) continue;
    await db
      .update(request)
      .set({ adminNoQuoteNotifiedAt: now })
      .where(and(
        eq(request.id, item.id),
        isNull(request.adminNoQuoteNotifiedAt),
      ));
    notified += 1;
  }

  return notified;
}

async function notifyAdminAboutExpiringOffers(
  db: Db,
  env: Bindings,
  now: Date,
) {
  const deadline = new Date(now.getTime() + ADMIN_EXPIRY_WINDOW_MS);
  const requests = await db.query.request.findMany({
    where: and(
      eq(request.status, "open"),
      isNull(request.adminExpiryNotifiedAt),
      hasOfferExpiringBefore(db, now, deadline),
    ),
    columns: {
      id: true,
      originAddress: true,
      destAddress: true,
      scheduledAt: true,
    },
    with: {
      user: { columns: { name: true, email: true, phone: true } },
      quotes: {
        where: and(
          eq(quote.status, "pending"),
          gt(quote.expiresAt, now),
          lte(quote.expiresAt, deadline),
        ),
        columns: { price: true, expiresAt: true },
        with: {
          driver: { columns: { name: true, email: true, phone: true } },
        },
      },
    },
    limit: 50,
  });
  if (requests.length === 0) return 0;

  let notified = 0;
  for (const item of requests) {
    const notifiedAdmins = await sendEmailToAdmins(db, env, adminOffersExpiringEmail({
      client: item.user,
      origin: item.originAddress,
      dest: item.destAddress,
      scheduledAt: item.scheduledAt,
      requestId: item.id,
      offers: item.quotes.map((offer) => ({
        driver: offer.driver,
        price: offer.price,
        expiresAt: offer.expiresAt,
      })),
    }));
    if (notifiedAdmins === 0) continue;
    await db
      .update(request)
      .set({ adminExpiryNotifiedAt: now })
      .where(and(
        eq(request.id, item.id),
        isNull(request.adminExpiryNotifiedAt),
      ));
    notified += 1;
  }

  return notified;
}

async function notifyClientsWithoutOffers(
  db: Db,
  env: Bindings,
  now: Date,
) {
  const requests = await db.query.request.findMany({
    where: and(
      eq(request.status, "open"),
      isNull(request.zeroQuoteNotifiedAt),
      lte(request.createdAt, new Date(now.getTime() - CLIENT_NO_OFFER_AFTER_MS)),
      not(hasActiveOffer(db, now)),
    ),
    columns: {
      id: true,
      originAddress: true,
      destAddress: true,
    },
    with: {
      user: { columns: { name: true, email: true } },
    },
    limit: 50,
  });

  let notified = 0;
  for (const item of requests) {
    const sent = await sendEmail(env, item.user.email, clientNoOfferRescueEmail({
      clientName: item.user.name,
      origin: item.originAddress,
      dest: item.destAddress,
      requestId: item.id,
      frontendUrl: env.FRONTEND_URL,
    }));
    if (!sent) continue;
    await db
      .update(request)
      .set({ zeroQuoteNotifiedAt: now })
      .where(and(
        eq(request.id, item.id),
        isNull(request.zeroQuoteNotifiedAt),
      ));
    notified += 1;
  }

  return notified;
}

async function notifyClientsAboutExpiringOffers(
  db: Db,
  env: Bindings,
  now: Date,
) {
  const deadline = new Date(now.getTime() + CLIENT_EXPIRY_WINDOW_MS);
  const requests = await db.query.request.findMany({
    where: and(
      eq(request.status, "open"),
      isNull(request.expiryRemindNotifiedAt),
      hasOfferExpiringBefore(db, now, deadline),
    ),
    columns: {
      id: true,
      originAddress: true,
      destAddress: true,
    },
    with: {
      user: { columns: { name: true, email: true } },
    },
    limit: 50,
  });

  let notified = 0;
  for (const item of requests) {
    const sent = await sendEmail(env, item.user.email, clientOffersExpiringEmail({
      clientName: item.user.name,
      origin: item.originAddress,
      dest: item.destAddress,
      requestId: item.id,
      frontendUrl: env.FRONTEND_URL,
    }));
    if (!sent) continue;
    await db
      .update(request)
      .set({ expiryRemindNotifiedAt: now })
      .where(and(
        eq(request.id, item.id),
        isNull(request.expiryRemindNotifiedAt),
      ));
    notified += 1;
  }

  return notified;
}

export async function runRequestRescueSweep(
  db: Db,
  env: Bindings,
  now = new Date(),
) {
  const expiredOffers = await expirePendingOffers(db, now);
  if (!env.RESEND_API_KEY) {
    logger.warn("Request rescue emails skipped because RESEND_API_KEY is not set");
    return { expiredOffers, adminNoOffer: 0, adminExpiry: 0, clientNoOffer: 0, clientExpiry: 0 };
  }

  const adminNoOffer = await notifyAdminAboutRequestsWithoutOffers(db, env, now);
  const adminExpiry = await notifyAdminAboutExpiringOffers(db, env, now);
  const clientNoOffer = await notifyClientsWithoutOffers(db, env, now);
  const clientExpiry = await notifyClientsAboutExpiringOffers(db, env, now);

  logger.info(
    "Request rescue sweep: {expiredOffers} expired offers, {adminNoOffer} admin no-offer alerts, {adminExpiry} admin expiry alerts, {clientNoOffer} client no-offer alerts, {clientExpiry} client expiry alerts",
    { expiredOffers, adminNoOffer, adminExpiry, clientNoOffer, clientExpiry },
  );

  return { expiredOffers, adminNoOffer, adminExpiry, clientNoOffer, clientExpiry };
}
