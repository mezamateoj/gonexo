import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { asc, count, eq } from "drizzle-orm";
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
// on a human decision — but any status can be requested. Paginated server-side
// so the (unbounded) verified tab never loads the whole table at once.
admin.get(
  "/drivers",
  zValidator(
    "query",
    z.object({
      status: z.enum(["pending", "submitted", "verified"]).default("submitted"),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    }),
  ),
  async (c) => {
    const { status, page, limit } = c.req.valid("query");
    const db = c.get("db");
    const where = eq(driverProfile.documentsStatus, status);

    const [data, countRows] = await Promise.all([
      db.query.driverProfile.findMany({
        where,
        limit,
        offset: (page - 1) * limit,
        with: {
          user: { columns: { id: true, name: true, email: true, phone: true } },
          documents: { orderBy: [asc(driverDocument.order)] },
        },
        // Stable chronological order by profile creation; not bumped by later
        // edits (updatedAt would be). Precise submission-time ordering arrives
        // with the Fase 3 review row.
        orderBy: (t, { asc }) => [asc(t.createdAt)],
      }),
      db.select({ n: count() }).from(driverProfile).where(where),
    ]);

    return c.json({ data, page, limit, total: countRows[0]?.n ?? 0 });
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

    // A driver only reaches "verified" from the review queue. Verifying a
    // "pending" profile would trust a driver who uploaded zero documents.
    if (action === "verify" && profile.documentsStatus !== "submitted") {
      throw badRequest("Driver has no submitted documents to verify");
    }
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
