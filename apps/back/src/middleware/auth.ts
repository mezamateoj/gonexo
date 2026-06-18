import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { driverProfile } from "../db/schema";
import type { AppEnv } from "../lib/types";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user")) return c.json({ error: "Unauthorized" }, 401);
  await next();
});

// Verifies the user has a driver profile and sets c.var.driverProfile.
export const requireDriver = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  const db = c.get("db");
  const profile = await db.query.driverProfile.findFirst({
    where: eq(driverProfile.userId, user.id),
  });
  if (!profile) return c.json({ error: "Driver profile required" }, 403);
  c.set("driverProfile", profile);
  await next();
});
