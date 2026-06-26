import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { driverProfile } from "../db/schema";
import { forbidden, unauthorized } from "../lib/errors";
import type { AppEnv } from "../lib/types";

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
