import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { badRequest, payloadTooLarge, unsupportedMediaType } from "../lib/errors";
import type { AppEnv } from "../lib/types";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const uploads = new Hono<AppEnv>();

// Swap the url base for an R2 public bucket / custom domain later.
uploads.post("/", requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File))
    throw badRequest("file field is required");
  if (!ALLOWED_TYPES.has(file.type))
    throw unsupportedMediaType("Only JPEG, PNG, and WebP are allowed");
  if (file.size > MAX_SIZE_BYTES)
    throw payloadTooLarge("File exceeds 10 MB limit");

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
