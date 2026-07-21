import { Hono } from "hono";
import * as Sentry from "@sentry/cloudflare";
import { eq } from "drizzle-orm";
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
import { isAdmin } from "./middleware/auth";
import { driverDocument, user as userTable } from "./db/schema";
import { normalizePhone } from "./lib/normalizers";
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
    { category: ["gonexo"], sinks: ["console"], lowestLevel: "debug" },
    { category: ["logtape", "meta"], sinks: ["console"], lowestLevel: "warning" },
  ],
});

const app = new Hono<AppEnv>();
const signUpPrecheckSchema = z.object({ phone: z.string().optional() }).passthrough();

app.use("*", (c, next) => {
  const allowedOrigins = [
    ...(c.env.ENVIRONMENT === "local" ? ["http://localhost:5173"] : []),
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
  category: ["gonexo", "http"],
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
  .route("/admin", admin)
  .route("/__seed", localSeed);

app.route("/api", api);

// All uploads require a session. Driver documents additionally belong only to
// the driver who registered them; request photos remain visible to signed-in users.
app.get("/cdn/:key", async (c) => {
  if (!c.get("user")) throw notFound();
  const key = c.req.param("key");
  const document = await c.get("db").query.driverDocument.findFirst({
    where: eq(driverDocument.key, key),
    with: { driverProfile: { columns: { userId: true } } },
  });
  // Owners see their own documents; admins can review any driver's documents.
  if (
    document &&
    document.driverProfile.userId !== c.get("user")?.id &&
    !isAdmin(c)
  ) {
    throw notFound();
  }
  const obj = await c.env.BUCKET.get(key);
  if (!obj) throw notFound();
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
  // Hourly Cron Trigger (wrangler.jsonc `triggers.crons`): auto-confirm
  // delivered jobs whose 24h client-confirmation window expired.
  scheduled: (_event, env, ctx) => {
    ctx.waitUntil(autoConfirmOverdueJobs(createDb(env.db)));
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
