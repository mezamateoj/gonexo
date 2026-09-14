import { upstreamError } from "./errors";

const MAPBOX_SUGGEST_URL = "https://api.mapbox.com/search/searchbox/v1/suggest";
const MAPBOX_RETRIEVE_URL =
  "https://api.mapbox.com/search/searchbox/v1/retrieve";

export type MapboxSuggestion = {
  mapbox_id: string;
  name: string;
  place_formatted?: string;
};

export type MapboxSuggestResponse = {
  suggestions?: MapboxSuggestion[];
};

export type MapboxRetrieveResponse = {
  features?: Array<{
    geometry: { coordinates: [number, number] };
    properties: { full_address?: string };
  }>;
};

export async function suggestAddresses(
  token: string,
  query: string,
  sessionToken: string,
): Promise<MapboxSuggestResponse> {
  const url = new URL(MAPBOX_SUGGEST_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("session_token", sessionToken);
  url.searchParams.set("language", "es");
  url.searchParams.set("country", "CL");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  if (!res.ok) throw upstreamError("Geocoding service error");
  return res.json() as Promise<MapboxSuggestResponse>;
}

export async function retrieveAddress(
  token: string,
  id: string,
  sessionToken: string,
): Promise<MapboxRetrieveResponse> {
  const url = new URL(`${MAPBOX_RETRIEVE_URL}/${encodeURIComponent(id)}`);
  url.searchParams.set("session_token", sessionToken);
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  if (!res.ok) throw upstreamError("Geocoding service error");
  return res.json() as Promise<MapboxRetrieveResponse>;
}
