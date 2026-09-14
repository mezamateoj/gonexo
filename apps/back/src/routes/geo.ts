import { Hono } from "hono";
import { badRequest } from "../lib/errors";
import { requireClient } from "../middleware/auth";
import type { AppEnv } from "../lib/types";
import { enforceRateLimit } from "../lib/rate-limit";
import { retrieveAddress, suggestAddresses } from "../lib/mapbox-search";

const geo = new Hono<AppEnv>();

// GET /api/geo/suggest?q=...&session=...
geo.get("/suggest", requireClient, async (c) => {
  await enforceRateLimit(
    c.env.GEO_RATE_LIMITER,
    `${c.get("user")!.id}:suggest`,
    "Too many geocoding requests",
  );
  const q = c.req.query("q")?.trim();
  const session = c.req.query("session")?.trim();

  if (!q || q.length < 3 || !session) {
    throw badRequest("q and session are required");
  }

  return c.json(await suggestAddresses(c.env.MAPBOX_TOKEN, q, session));
});

// GET /api/geo/retrieve?id=...&session=...
geo.get("/retrieve", requireClient, async (c) => {
  await enforceRateLimit(
    c.env.GEO_RATE_LIMITER,
    `${c.get("user")!.id}:retrieve`,
    "Too many geocoding requests",
  );
  const id = c.req.query("id")?.trim();
  const session = c.req.query("session")?.trim();

  if (!id || !session) {
    throw badRequest("id and session are required");
  }

  return c.json(await retrieveAddress(c.env.MAPBOX_TOKEN, id, session));
});

export default geo;
