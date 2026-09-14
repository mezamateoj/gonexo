import { Hono } from "hono";
import * as Sentry from "@sentry/cloudflare";
import { eq, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { cors } from "hono/cors";
import { configureSync, getConsoleSink, logfmtFormatter, resetSync } from "@logtape/logtape";
import { honoLogger } from "@logtape/hono";
import { createAuth } from "./lib/auth";
import { AppError, badRequest, notFound } from "./lib/errors";
import { logger } from "./lib/logger";
import type { AppEnv } from "./lib/types";
import { dbMiddleware } from "./middleware/db";
import { createDb } from "./db";
import { autoConfirmOverdueJobs } from "./workflows/jobs";
import { runRequestRescueSweep } from "./workflows/request-rescue";
import type { Bindings } from "./binding";
import requests from "./routes/requests";
import quotes from "./routes/quotes";
import jobs from "./routes/jobs";
import drivers from "./routes/drivers";
import users from "./routes/users";
import uploads from "./routes/uploads";
import geo from "./routes/geo";
import seed from "./routes/seed";
import admin from "./routes/admin";
import attention from "./routes/attention";
import payments from "./routes/payments";
import intake from "./routes/intake";
import { isAdmin } from "./middleware/auth";
import { driverDocument, job, requestPhoto, user as userTable } from "./db/schema";
import { normalizePhone } from "./lib/normalizers";
import { accountTypes } from "./domain/accounts";
import { paymentAllowsDriverAccess } from "./domain/payments";
import {
  markDocumentReviewFailed,
  processDocumentReview,
  type DocumentReviewMessage,
} from "./workflows/document-reviews";

resetSync();
configureSync({
  sinks: {
    console: getConsoleSink({
      formatter: logfmtFormatter,
    }),
  },
  loggers: [
    { category: ["cargup"], sinks: ["console"], lowestLevel: "debug" },
    { category: ["logtape", "meta"], sinks: ["console"], lowestLevel: "warning" },
  ],
});

const app = new Hono<AppEnv>();
const CARGUP_ORIGIN = "https://cargup.cl";
const signUpPrecheckSchema = z.object({
  accountType: z.enum(accountTypes),
  phone: z.string().optional(),
}).passthrough();

app.use("*", (c, next) => {
  const allowedOrigins = [
    ...(c.env.ENVIRONMENT === "local" ? ["http://localhost:5173"] : []),
    CARGUP_ORIGIN,
    c.env.FRONTEND_URL,
  ];

  return cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })(c, next);
});

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { error: { code: err.code, message: err.message } },
      err.status,
    );
  }

  logger.error("Unhandled error on {method} {path}: {error}", {
    method: c.req.method,
    path: c.req.path,
    error: err,
  });
  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    },
    500,
  );
});

app.use("*", honoLogger({
  category: ["cargup", "http"],
  format: "structured-combined",
  skip: (c) => c.req.path === "/",
}));

app.use("*", dbMiddleware);

app.post("/api/auth/sign-up/email", async (c) => {
  const json = await c.req.raw.clone().json().catch(() => null);
  const parsedBody = signUpPrecheckSchema.safeParse(json);
  if (!parsedBody.success) throw badRequest("Invalid request body");
  const body = parsedBody.data;
  const { phone } = body;
  if (phone) {
    const existing = await c.get("db").query.user.findFirst({
      where: eq(userTable.phone, normalizePhone(phone)),
    });
    if (existing) {
      return c.json({ code: "PHONE_NUMBER_EXISTS", message: "Phone number is already in use" }, 409);
    }
  }
  return createAuth(c.get("db")).handler(c.req.raw);
});

app.on(["GET", "POST"], "/api/auth/*", (c) =>
  createAuth(c.get("db")).handler(c.req.raw),
);

// Runs on every request. Sets user/session to null when unauthenticated.
// requireAuth / requireDriver in middleware/auth.ts guard individual routes.
app.use("*", async (c, next) => {
  const session = await createAuth(c.get("db")).api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  c.set("driverProfile", null);
  await next();
});

const localSeed = new Hono<AppEnv>();
localSeed.use("*", async (c, next) => {
  if (c.env.ENVIRONMENT !== "local") throw notFound();
  await next();
});
localSeed.route("/", seed);

const api = new Hono<AppEnv>()
  .route("/requests", requests)
  .route("/quotes", quotes)
  .route("/jobs", jobs)
  .route("/drivers", drivers)
  .route("/users", users)
  .route("/uploads", uploads)
  .route("/geo", geo)
  .route("/attention", attention)
  .route("/payments", payments)
  .route("/intake", intake)
  .route("/admin", admin)
  .route("/__seed", localSeed);

app.route("/api", api);

// All uploads require a session. Driver documents belong to their owner/admin;
// request photos unlock to the matched driver only after verified payment.
app.get("/cdn/:key", async (c) => {
  const user = c.get("user");
  if (!user) throw notFound();
  const key = c.req.param("key");
  const suffix = `/cdn/${key}`;
  const [document, photos, photoJobs, obj] = await Promise.all([
    c.get("db").query.driverDocument.findFirst({
      where: eq(driverDocument.key, key),
      with: { driverProfile: { columns: { userId: true } } },
    }),
    c.get("db").query.requestPhoto.findMany({
      where: sql`substr(${requestPhoto.url}, -${suffix.length}) = ${suffix}`,
      with: {
        request: {
          columns: { userId: true },
          with: {
            jobs: {
              where: ne(job.status, "cancelled"),
              limit: 1,
              columns: { driverId: true, paymentStatus: true },
            },
          },
        },
      },
    }),
    c.get("db").query.job.findMany({
      where: or(eq(job.beforePhotoKey, key), eq(job.afterPhotoKey, key)),
      columns: { userId: true, driverId: true },
    }),
    c.env.BUCKET.get(key),
  ]);
  if (!obj) throw notFound();
  if (!isAdmin(c)) {
    if (document) {
      if (document.driverProfile.userId !== user.id) throw notFound();
    } else if (photos.length > 0) {
      const canSeePhoto = photos.some((photo) => {
        const paymentJob = photo.request.jobs[0];
        return photo.request.userId === user.id ||
          (!!paymentJob &&
            paymentJob.driverId === user.id &&
            paymentAllowsDriverAccess(paymentJob.paymentStatus));
      });
      if (!canSeePhoto) throw notFound();
    } else if (photoJobs.length > 0) {
      if (!photoJobs.some((item) => item.userId === user.id || item.driverId === user.id)) {
        throw notFound();
      }
    } else if (obj.customMetadata?.userId !== user.id) {
      throw notFound();
    }
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=3600");
  return new Response(obj.body, { headers });
});

app.get("/", (c) => c.json({ ok: true }));

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "Not found",
      },
    },
    404,
  ),
);

export type AppType = typeof api;

const worker = {
  fetch: app.fetch,
  // Hourly Cron Trigger: advance overdue lifecycle work and rescue requests.
  scheduled: (_event, env, ctx) => {
    const db = createDb(env.db);
    ctx.waitUntil(Promise.all([
      autoConfirmOverdueJobs(db),
      runRequestRescueSweep(db, env),
    ]));
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      if (batch.queue.endsWith("-dlq")) {
        await markDocumentReviewFailed(env, message.body.reviewId);
      } else {
        await processDocumentReview(env, message.body.reviewId);
      }
    }
  },
} satisfies ExportedHandler<Bindings, DocumentReviewMessage>;

export default Sentry.withSentry<Bindings, DocumentReviewMessage>(
  (env) => env.SENTRY_DSN ? {
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    tracesSampleRate: 0.1,
    enableMetrics: true,
    flushInterval: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      queryParams: false,
      genAI: { inputs: false, outputs: false },
      stackFrameVariables: false,
    },
  } : undefined,
  worker,
);
