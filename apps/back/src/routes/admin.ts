import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { driverDocument, driverProfile } from "../db/schema";
import { requireAdmin } from "../middleware/auth";
import { badRequest, notFound } from "../lib/errors";
import type { AppEnv } from "../lib/types";

// All routes here sit under /api/admin and require an admin session. Users
// list/search comes from the Better Auth admin plugin (`/api/auth/admin/*`),
// so this module only owns driver verification.
const admin = new Hono<AppEnv>();

admin.use("*", requireAdmin);

// Driver verification queue. Defaults to `submitted` — the profiles waiting
// on a human decision — but any status can be requested.
admin.get(
  "/drivers",
  zValidator(
    "query",
    z.object({
      status: z.enum(["pending", "submitted", "verified"]).default("submitted"),
    }),
  ),
  async (c) => {
    const { status } = c.req.valid("query");
    const drivers = await c.get("db").query.driverProfile.findMany({
      where: eq(driverProfile.documentsStatus, status),
      with: {
        user: { columns: { id: true, name: true, email: true, phone: true } },
        documents: { orderBy: [asc(driverDocument.order)] },
      },
      // Stable chronological order by profile creation; not bumped by later
      // edits (updatedAt would be). Precise submission-time ordering arrives
      // with the Fase 3 review row.
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
    return c.json({ drivers });
  },
);

// The verification lever. `verify` marks the driver trusted; `reset` returns
// them to the review queue. The schema check constraint
// (isVerified ⇒ documentsStatus = 'verified') keeps both fields consistent.
admin.patch(
  "/drivers/:id/verification",
  zValidator("json", z.object({ action: z.enum(["verify", "reset"]) })),
  async (c) => {
    const id = c.req.param("id");
    const { action } = c.req.valid("json");
    const db = c.get("db");

    const profile = await db.query.driverProfile.findFirst({
      where: eq(driverProfile.id, id),
    });
    if (!profile) throw notFound("Driver profile not found");

    // A driver who never submitted documents has nothing to reset — don't drag
    // them into the review queue.
    if (action === "reset" && profile.documentsStatus === "pending") {
      throw badRequest("Driver has no submitted documents to reset");
    }

    const [updated] = await db
      .update(driverProfile)
      .set(
        action === "verify"
          ? { documentsStatus: "verified", isVerified: true }
          : { documentsStatus: "submitted", isVerified: false },
      )
      .where(eq(driverProfile.id, id))
      .returning();

    return c.json({ driver: updated });
  },
);

export default admin;
