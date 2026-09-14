import { and, eq, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { job, jobEvent, mercadoPagoPayment } from "../db/schema";
import type { Db } from "../db";
import type { PaymentStatus } from "../domain/payments";
import { badRequest, conflict, notFound, upstreamError } from "../lib/errors";
import { logger } from "../lib/logger";
import { createMercadoPagoClients } from "../lib/mercado-pago";

const RESERVATION_MS = 48 * 60 * 60 * 1000;

function reservationExpiresAt(createdAt: Date) {
  return new Date(createdAt.getTime() + RESERVATION_MS);
}

function providerDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function providerErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function createJobCheckout(
  db: Db,
  input: {
    accessToken: string;
    backendUrl: string;
    frontendUrl: string;
    jobId: string;
    userId: string;
    payerEmail: string;
  },
) {
  const paymentJob = await db.query.job.findFirst({
    where: and(eq(job.id, input.jobId), eq(job.userId, input.userId)),
    columns: {
      id: true,
      status: true,
      paymentStatus: true,
      agreedPrice: true,
      mercadoPagoPreferenceId: true,
      createdAt: true,
    },
  });
  if (!paymentJob) throw notFound("Job not found");
  if (paymentJob.status !== "scheduled") throw conflict("Job cannot be paid");
  if (paymentJob.paymentStatus !== "pending") throw conflict("Job is not awaiting payment");
  if (reservationExpiresAt(paymentJob.createdAt) <= new Date()) {
    throw conflict("Payment reservation has expired");
  }
  if (paymentJob.mercadoPagoPreferenceId) {
    return { preferenceId: paymentJob.mercadoPagoPreferenceId };
  }

  const checkoutUrl = `${input.frontendUrl}/jobs/${paymentJob.id}`;
  const { preference } = createMercadoPagoClients(input.accessToken);
  let created;
  try {
    created = await preference.create({
      body: {
        items: [{
          id: paymentJob.id,
          title: "Flete CargUp",
          currency_id: "CLP",
          quantity: 1,
          unit_price: paymentJob.agreedPrice,
        }],
        payer: { email: input.payerEmail },
        external_reference: paymentJob.id,
        back_urls: {
          success: `${checkoutUrl}?checkout=success`,
          pending: `${checkoutUrl}?checkout=pending`,
          failure: `${checkoutUrl}?checkout=failure`,
        },
        auto_return: "approved",
        notification_url: `${input.backendUrl}/api/payments/mercado-pago/webhook`,
        expires: true,
        expiration_date_to: reservationExpiresAt(paymentJob.createdAt).toISOString(),
      },
      requestOptions: { idempotencyKey: `job-checkout-${paymentJob.id}` },
    });
  } catch (error) {
    logger.warn("Mercado Pago preference creation failed for job {jobId}: {error}", {
      jobId: paymentJob.id,
      error: providerErrorName(error),
    });
    throw upstreamError("Could not create payment checkout");
  }

  if (!created.id) {
    throw upstreamError("Mercado Pago returned an invalid preference");
  }

  const stored = await db
    .update(job)
    .set({
      mercadoPagoPreferenceId: created.id,
    })
    .where(and(
      eq(job.id, paymentJob.id),
      eq(job.status, "scheduled"),
      eq(job.paymentStatus, "pending"),
      sql`${job.mercadoPagoPreferenceId} is null`,
    ))
    .returning({ preferenceId: job.mercadoPagoPreferenceId });
  if (stored[0]?.preferenceId) return { preferenceId: stored[0].preferenceId };

  const existing = await db.query.job.findFirst({
    where: eq(job.id, paymentJob.id),
    columns: { mercadoPagoPreferenceId: true },
  });
  if (existing?.mercadoPagoPreferenceId) {
    return { preferenceId: existing.mercadoPagoPreferenceId };
  }
  throw conflict("Job can no longer be paid");
}

function aggregatePaymentStatus(status: string): PaymentStatus | null {
  if (status === "approved" || status === "refunded" || status === "charged_back") {
    return status;
  }
  return null;
}

export async function reconcileMercadoPagoPayment(
  db: Db,
  accessToken: string,
  requestedPaymentId: string,
  expectedJobId?: string,
) {
  const clients = createMercadoPagoClients(accessToken);
  let payment;
  try {
    payment = await clients.payment.get({ id: requestedPaymentId });
  } catch (error) {
    logger.warn("Mercado Pago payment lookup failed for payment {paymentId}: {error}", {
      paymentId: requestedPaymentId,
      error: providerErrorName(error),
    });
    throw upstreamError("Could not verify Mercado Pago payment");
  }

  const paymentId = payment.id?.toString();
  const externalReference = payment.external_reference;
  const amount = payment.transaction_amount;
  const currency = payment.currency_id;
  const collectorId = payment.collector_id;
  const providerStatus = payment.status;
  const liveMode = payment.live_mode;
  const merchantOrderId = payment.order?.id;
  if (
    !paymentId || paymentId !== requestedPaymentId || !externalReference ||
    typeof amount !== "number" || !Number.isInteger(amount) ||
    currency !== "CLP" || !collectorId ||
    !providerStatus || typeof liveMode !== "boolean" || !merchantOrderId ||
    payment.order?.type !== "mercadopago"
  ) {
    throw badRequest("Invalid Mercado Pago payment");
  }
  if (expectedJobId && externalReference !== expectedJobId) {
    throw badRequest("Payment does not belong to this job");
  }

  const paymentJob = await db.query.job.findFirst({
    where: eq(job.id, externalReference),
    columns: {
      id: true,
      driverId: true,
      status: true,
      paymentStatus: true,
      agreedPrice: true,
      mercadoPagoPreferenceId: true,
      mercadoPagoPaymentId: true,
      createdAt: true,
    },
    with: {
      driver: { columns: { name: true, email: true } },
      request: { columns: { originAddress: true, destAddress: true } },
    },
  });
  if (!paymentJob?.mercadoPagoPreferenceId) {
    throw badRequest("Payment does not belong to a payable job");
  }

  let merchantOrder;
  let canonicalPreference;
  try {
    [merchantOrder, canonicalPreference] = await Promise.all([
      clients.merchantOrder.get({ merchantOrderId }),
      clients.preference.get({ preferenceId: paymentJob.mercadoPagoPreferenceId }),
    ]);
  } catch (error) {
    logger.warn("Mercado Pago order lookup failed for payment {paymentId}: {error}", {
      paymentId,
      error: providerErrorName(error),
    });
    throw upstreamError("Could not verify Mercado Pago order");
  }

  if (
    merchantOrder.preference_id !== paymentJob.mercadoPagoPreferenceId ||
    canonicalPreference.id !== paymentJob.mercadoPagoPreferenceId ||
    canonicalPreference.external_reference !== paymentJob.id ||
    canonicalPreference.collector_id !== collectorId ||
    merchantOrder.external_reference !== paymentJob.id ||
    merchantOrder.collector?.id !== collectorId ||
    amount !== paymentJob.agreedPrice ||
    merchantOrder.total_amount !== paymentJob.agreedPrice ||
    !merchantOrder.payments?.some((item) => item.id?.toString() === paymentId)
  ) {
    throw badRequest("Mercado Pago payment verification failed");
  }

  const existingPayment = await db.query.mercadoPagoPayment.findFirst({
    where: eq(mercadoPagoPayment.id, paymentId),
    columns: { jobId: true },
  });
  if (existingPayment && existingPayment.jobId !== paymentJob.id) {
    throw badRequest("Mercado Pago payment is already linked to another job");
  }

  const providerCreatedAt = providerDate(payment.date_created);
  const providerApprovedAt = providerDate(payment.date_approved);
  const providerUpdatedAt = providerDate(payment.date_last_updated);
  const providerValues = {
    id: paymentId,
    jobId: paymentJob.id,
    externalReference,
    status: providerStatus,
    statusDetail: payment.status_detail ?? null,
    amount,
    currency,
    liveMode,
    providerCreatedAt,
    providerApprovedAt,
    providerUpdatedAt,
  };
  const aggregateStatus = aggregatePaymentStatus(providerStatus);
  const upsertPayment = db
    .insert(mercadoPagoPayment)
    .values(providerValues)
    .onConflictDoUpdate({
      target: mercadoPagoPayment.id,
      set: {
        status: providerValues.status,
        statusDetail: providerValues.statusDetail,
        amount: providerValues.amount,
        currency: providerValues.currency,
        liveMode: providerValues.liveMode,
        providerCreatedAt,
        providerApprovedAt,
        providerUpdatedAt,
      },
      setWhere: providerUpdatedAt
        ? or(
            isNull(mercadoPagoPayment.providerUpdatedAt),
            lte(mercadoPagoPayment.providerUpdatedAt, providerUpdatedAt),
          )
        : isNull(mercadoPagoPayment.providerUpdatedAt),
    });

  if (!aggregateStatus) {
    await upsertPayment;
    return { paymentStatus: paymentJob.paymentStatus, becameApproved: false as const };
  }

  const timelyApproval = !!providerApprovedAt &&
    providerApprovedAt <= reservationExpiresAt(paymentJob.createdAt);
  if (aggregateStatus === "approved" && !timelyApproval) {
    await upsertPayment;
    return { paymentStatus: paymentJob.paymentStatus, becameApproved: false as const };
  }
  const fromStatuses: PaymentStatus[] = aggregateStatus === "approved"
    ? ["pending"]
    : aggregateStatus === "refunded"
      ? ["approved"]
      : ["approved", "refunded"];

  const normalTransition = and(
    inArray(job.paymentStatus, fromStatuses),
    aggregateStatus === "approved"
      ? sql`${job.mercadoPagoPaymentId} is null`
      : eq(job.mercadoPagoPaymentId, paymentId),
    ...(aggregateStatus === "approved" ? [eq(job.status, "scheduled")] : []),
  );
  const terminalCatchUp = aggregateStatus !== "approved" && timelyApproval
    ? and(
        eq(job.paymentStatus, "pending"),
        sql`${job.mercadoPagoPaymentId} is null`,
      )
    : undefined;
  const transitionWhere = and(
    eq(job.id, paymentJob.id),
    terminalCatchUp ? or(normalTransition, terminalCatchUp) : normalTransition,
  );
  const eventType = `payment_${aggregateStatus}`;

  const [, , updatedRows] = await db.batch([
    upsertPayment,
    db.insert(jobEvent).select(
      db
        .select({
          id: sql<string>`${crypto.randomUUID()}`.as("id"),
          jobId: job.id,
          type: sql<string>`${eventType}`.as("type"),
          actorRole: sql<string>`'system'`.as("actor_role"),
          meta: sql<string>`${JSON.stringify({ paymentId, status: aggregateStatus })}`.as("meta"),
          createdAt: sql<Date>`cast(unixepoch('subsecond') * 1000 as integer)`.as("created_at"),
        })
        .from(job)
        .where(transitionWhere),
    ),
    db
      .update(job)
      .set({
        paymentStatus: aggregateStatus,
        mercadoPagoPaymentId: paymentId,
        ...(providerApprovedAt ? { paidAt: providerApprovedAt } : {}),
      })
      .where(transitionWhere)
      .returning({ id: job.id }),
  ]);
  const transitioned = updatedRows.length === 1;

  if (aggregateStatus === "approved" && transitioned) {
    return {
      paymentStatus: aggregateStatus,
      becameApproved: true as const,
      driver: paymentJob.driver,
      request: paymentJob.request,
      agreedPrice: paymentJob.agreedPrice,
      jobId: paymentJob.id,
    };
  }

  const currentJob = transitioned
    ? null
    : await db.query.job.findFirst({
        where: eq(job.id, paymentJob.id),
        columns: { paymentStatus: true },
      });

  return {
    paymentStatus: transitioned
      ? aggregateStatus
      : currentJob?.paymentStatus ?? paymentJob.paymentStatus,
    becameApproved: false as const,
  };
}

export async function recordManualDriverSettlement(
  db: Db,
  jobId: string,
  reference: string,
  adminId: string,
) {
  const settledAt = new Date();
  const eligible = and(
    eq(job.id, jobId),
    eq(job.paymentStatus, "approved"),
    isNull(job.driverSettledAt),
    ne(job.status, "cancelled"),
  );
  const [, settled] = await db.batch([
    db.insert(jobEvent).select(
      db
        .select({
          id: sql<string>`${crypto.randomUUID()}`.as("id"),
          jobId: job.id,
          type: sql<string>`'driver_settled'`.as("type"),
          actorRole: sql<string>`'operator'`.as("actor_role"),
          meta: sql<string>`${JSON.stringify({ reference, recordedBy: adminId })}`.as("meta"),
          createdAt: sql<Date>`cast(unixepoch('subsecond') * 1000 as integer)`.as("created_at"),
        })
        .from(job)
        .where(eligible),
    ),
    db
      .update(job)
      .set({ driverSettledAt: settledAt, driverSettlementReference: reference })
      .where(eligible)
      .returning({
        id: job.id,
        driverPayout: job.driverPayout,
        driverSettledAt: job.driverSettledAt,
        driverSettlementReference: job.driverSettlementReference,
      }),
  ]);
  if (settled[0]) return settled[0];

  const current = await db.query.job.findFirst({
    where: eq(job.id, jobId),
    columns: {
      id: true,
      status: true,
      paymentStatus: true,
      driverPayout: true,
      driverSettledAt: true,
      driverSettlementReference: true,
    },
  });
  if (!current) throw notFound("Job not found");
  if (
    current.driverSettledAt &&
    current.driverSettlementReference === reference
  ) {
    return current;
  }
  if (current.driverSettledAt) throw conflict("Driver settlement is already recorded");
  if (current.paymentStatus !== "approved") {
    throw conflict("Verified client payment is required before settlement");
  }
  throw conflict("Cancelled jobs cannot be settled");
}
