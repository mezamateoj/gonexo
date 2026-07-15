import { Hono } from "hono";
import { badRequest, upstreamError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../lib/types";
import { enforceRateLimit } from "../lib/rate-limit";

const MAPBOX_SUGGEST_URL = "https://api.mapbox.com/search/searchbox/v1/suggest";
const MAPBOX_RETRIEVE_URL =
  "https://api.mapbox.com/search/searchbox/v1/retrieve";

const geo = new Hono<AppEnv>();

// GET /api/geo/suggest?q=...&session=...
geo.get("/suggest", requireAuth, async (c) => {
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

  const url = new URL(MAPBOX_SUGGEST_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("session_token", session);
  url.searchParams.set("language", "es");
  url.searchParams.set("country", "CL");
  url.searchParams.set("access_token", c.env.MAPBOX_TOKEN);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw upstreamError("Geocoding service error");
  }

  const data = await res.json();
  return c.json(data);
});

// GET /api/geo/retrieve?id=...&session=...
geo.get("/retrieve", requireAuth, async (c) => {
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

  const url = new URL(`${MAPBOX_RETRIEVE_URL}/${encodeURIComponent(id)}`);
  url.searchParams.set("session_token", session);
  url.searchParams.set("access_token", c.env.MAPBOX_TOKEN);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw upstreamError("Geocoding service error");
  }

  const data = await res.json();
  return c.json(data);
});

export default geo;
