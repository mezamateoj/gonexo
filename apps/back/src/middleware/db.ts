import { createMiddleware } from "hono/factory";
import { createDb } from "../db";
import type { AppEnv } from "../lib/types";

export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("db", createDb(c.env.db));
  await next();
});
