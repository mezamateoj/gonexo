import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/types";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const uploads = new Hono<AppEnv>();

// Swap the url base for an R2 public bucket / custom domain later.
uploads.post("/", requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File))
    return c.json({ error: "file field is required" }, 400);
  if (!ALLOWED_TYPES.has(file.type))
    return c.json({ error: "Only JPEG, PNG, and WebP are allowed" }, 415);
  if (file.size > MAX_SIZE_BYTES)
    return c.json({ error: "File exceeds 10 MB limit" }, 413);

  const ext = file.type.split("/")[1];
  const key = `${crypto.randomUUID()}.${ext}`;

  await c.env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const url = new URL(c.req.url);
  return c.json({ key, url: `${url.origin}/cdn/${key}` }, 201);
});

export type UploadsType = typeof uploads;
export default uploads;
