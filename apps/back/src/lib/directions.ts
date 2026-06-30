// Thin Mapbox Directions client. Resolves the real driving route between two
// points so pricing/ETA use road distance, not straight-line.
//
// We use the `driving` profile (typical conditions), NOT `driving-traffic`:
// moves are scheduled for the future, so live traffic at request time isn't
// representative. `overview=false` skips route geometry we don't need.

const MAPBOX_DIRECTIONS_URL =
  "https://api.mapbox.com/directions/v5/mapbox/driving";

type DirectionsResponse = {
  routes?: { distance: number; duration: number }[];
};

export type RouteResult = { distanceM: number; durationS: number };

// Returns null on any failure (network, non-200, no route). Request creation
// must still succeed when Directions is down — pricing falls back to haversine.
export async function mapboxDirections(
  token: string,
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): Promise<RouteResult | null> {
  const coords = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
  const url = new URL(`${MAPBOX_DIRECTIONS_URL}/${coords}`);
  url.searchParams.set("overview", "false");
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as DirectionsResponse;
    const route = data.routes?.[0];
    // Guard the external boundary: a malformed response must yield null, not a
    // NaN distance persisted to the DB and fed into pricing.
    if (!route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
      return null;
    }
    return {
      distanceM: Math.round(route.distance),
      durationS: Math.round(route.duration),
    };
  } catch {
    return null;
  }
}
