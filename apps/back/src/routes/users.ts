import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { user } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/types";

const users = new Hono<AppEnv>();

users.get("/me", requireAuth, (c) => {
  return c.json(c.get("user"));
});

const updateMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
});

users.patch(
  "/me",
  requireAuth,
  zValidator("json", updateMeSchema),
  async (c) => {
    const db = c.get("db");
    const u = c.get("user")!;
    const body = c.req.valid("json");

    if (!body.name && !body.phone)
      return c.json({ error: "Nothing to update" }, 400);

    await db
      .update(user)
      .set({ ...body })
      .where(eq(user.id, u.id));

    return c.json({ ok: true });
  }
);

export type UsersType = typeof users;
export default users;
