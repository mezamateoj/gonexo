import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { user } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { badRequest } from "../lib/errors";
import type { AppEnv } from "../lib/types";
import { normalizePhone } from "../lib/normalizers";

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
      throw badRequest("Nothing to update");

    const updates = body.phone
      ? { ...body, phone: normalizePhone(body.phone) }
      : body;

    await db
      .update(user)
      .set(updates)
      .where(eq(user.id, u.id));

    return c.json({ ok: true });
  }
);

export type UsersType = typeof users;
export default users;
