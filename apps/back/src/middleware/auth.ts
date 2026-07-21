import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { driverProfile } from "../db/schema";
import { forbidden, unauthorized } from "../lib/errors";
import type { AppEnv } from "../lib/types";

// Admin status is the Better Auth `user.role` column. Read from the session
// user (the framework's own admin endpoints trust the same source), so a role
// change takes effect on the next session refresh (cookie cache, ~5 min) or a
// re-login.
export function isAdmin(c: Context<AppEnv>): boolean {
  return c.get("user")?.role === "admin";
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user")) throw unauthorized();
  await next();
});

// Verifies the user has a driver profile and sets c.var.driverProfile.
export const requireDriver = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) throw unauthorized();

  const db = c.get("db");
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.userId, user.id),
  });
  if (!profile) throw forbidden("Driver profile required");
  c.set("driverProfile", profile);
  await next();
});

// Guards the admin panel routes. Bootstrap admins and role "admin" pass.
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user")) throw unauthorized();
  if (!isAdmin(c)) throw forbidden("Admin access required");
  await next();
});
