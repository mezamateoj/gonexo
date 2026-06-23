import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./lib/auth";
import type { AppEnv } from "./lib/types";
import { dbMiddleware } from "./middleware/db";
import requests from "./routes/requests";
import quotes from "./routes/quotes";
import jobs from "./routes/jobs";
import drivers from "./routes/drivers";
import users from "./routes/users";
import uploads from "./routes/uploads";

const allowedOrigins = [
  "http://localhost:5173",
  "https://gonexo-front.mezamateoj.workers.dev",
];

const app = new Hono<AppEnv>();

app.use("*", (c, next) =>
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })(c, next),
);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

app.use("*", dbMiddleware);

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

const api = new Hono<AppEnv>()
  .route("/requests", requests)
  .route("/quotes", quotes)
  .route("/jobs", jobs)
  .route("/drivers", drivers)
  .route("/users", users)
  .route("/uploads", uploads);

app.route("/api", api);

// Switch to a proper R2 custom domain later; this is fine for MVP.
app.get("/cdn/:key", async (c) => {
  const obj = await c.env.BUCKET.get(c.req.param("key"));
  if (!obj) return c.json({ error: "Not found" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
});

app.get("/", (c) => c.json({ ok: true }));

export type AppType = typeof api;

export default app;
