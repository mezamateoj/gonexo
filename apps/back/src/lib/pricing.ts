// Fair-price-range heuristic (v1) for Chilean fletes/mudanzas.
//
// Pure and deterministic: it takes the route distance (km) as input — the caller
// passes Mapbox Directions road distance stored on the request, or a haversine
// fallback. No network here, so it stays unit-testable. This is the timeboxed
// Phase 4.3 spike — an ADVISORY band shown to drivers as a fair-quote guide and
// to clients as a reasonable expectation. It is never a mandated price.
//
// Structure (industry-standard; matches how movers and Uber both quote):
//   point = ( base_by_volume + distance + access + labor + addons ) × timing
//   band  = [ point × bandMin , point × bandMax ]
//
// Every coefficient lives in PRICING so it can be tuned in one place as real
// driver quotes accrue. Values are calibrated against published Chilean rates
// (FletesPro: ~$28.000 + km×$2.000 urban, helper +$7.000; cronoshare: $30–50k/m³).
// Note: effective per-km here (perKm × roundTripFactor) bakes in the dead-head/
// empty-return cost — adjust roundTripFactor or perKm together.

export const PRICING = {
  baseByVolume: {
    small: 30_000,
    medium: 60_000,
    large: 120_000,
    full_move: 220_000,
  },
  freeKm: 10, // first km folded into the base (local moves)
  perKmUrban: 1_500, // route ≤ urbanMaxKm
  perKmRegional: 1_200, // route > urbanMaxKm
  urbanMaxKm: 50,
  roundTripFactor: 1.4, // dead-head allowance on real road distance (driver eats part of the empty return)
  noElevatorPerFloor: 6_000, // per floor above ground, no elevator (origin + dest)
  longCarry: 10_000,
  helperEach: 10_000, // per requested helper (0–3)
  fragile: 8_000,
  assemblyPct: 0.15, // share of the core subtotal
  packingPct: 0.25,
  timing: {
    peakSeason: 1.15, // southern summer: Dec, Jan, Feb
    weekend: 1.1,
    endOfMonth: 1.1, // first/last 3 days — Chilean "fin de mes" lease cycle
  },
  bandMin: 0.85,
  bandMax: 1.25,
  roundTo: 1_000, // round CLP outputs to the nearest 1.000
} as const;

// Applied to straight-line haversine when no real route distance is available,
// approximating road circuity (typical urban detour over crow-flies).
export const CIRCUITY_FACTOR = 1.3;

// Acceptance window for submitted quotes, relative to the fair band. Deliberately
// wide — the band is advisory, so drivers keep latitude; these only reject absurd
// quotes (typos, wild lowballs, gouging). A submitted range must satisfy
// priceMin ≥ fair.min × QUOTE_FLOOR_FACTOR and priceMax ≤ fair.max × QUOTE_CEILING_FACTOR.
export const QUOTE_FLOOR_FACTOR = 0.5;
export const QUOTE_CEILING_FACTOR = 2.5;

// Platform commission on the agreed price (job.platformFee). Shared with the
// price-range response so the driver's displayed payout matches what's actually
// deducted on accept.
export const PLATFORM_FEE_RATE = 0.12;

export type VolumeCategory = keyof typeof PRICING.baseByVolume;

export type PriceRangeInput = {
  volumeCategory: VolumeCategory;
  distanceKm: number; // road distance (Mapbox) or haversine × CIRCUITY_FACTOR
  originFloor: number | null;
  originHasElevator: boolean;
  destFloor: number | null;
  destHasElevator: boolean;
  longCarry: boolean;
  helpersNeeded: number;
  assemblyRequired: boolean;
  packingIncluded: boolean;
  hasFragileItems: boolean;
  scheduledAt: Date;
};

export type PriceRange = {
  min: number;
  mid: number;
  max: number;
  distanceKm: number;
};

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

function roundCLP(n: number): number {
  return Math.round(n / PRICING.roundTo) * PRICING.roundTo;
}

// Stairs surcharge: only when there is no elevator and the unit is above ground.
function floorSurcharge(floor: number | null, hasElevator: boolean): number {
  if (hasElevator || floor == null || floor <= 1) return 0;
  return (floor - 1) * PRICING.noElevatorPerFloor;
}

// Timing multiplier from the scheduled date. Uses UTC; for a heuristic the few
// hours of Chile offset are immaterial.
function timingMultiplier(date: Date): number {
  let m = 1;
  const month = date.getUTCMonth(); // 0=Jan
  if (month === 11 || month === 0 || month === 1) m *= PRICING.timing.peakSeason;
  const day = date.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) m *= PRICING.timing.weekend;
  const dom = date.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  if (dom <= 3 || dom > daysInMonth - 3) m *= PRICING.timing.endOfMonth;
  return m;
}

export function computePriceRange(input: PriceRangeInput): PriceRange {
  const routeKm = input.distanceKm;
  const billableKm = Math.max(0, routeKm - PRICING.freeKm);
  const perKm =
    routeKm <= PRICING.urbanMaxKm ? PRICING.perKmUrban : PRICING.perKmRegional;
  const distance = billableKm * perKm * PRICING.roundTripFactor;

  const base = PRICING.baseByVolume[input.volumeCategory];

  const access =
    floorSurcharge(input.originFloor, input.originHasElevator) +
    floorSurcharge(input.destFloor, input.destHasElevator) +
    (input.longCarry ? PRICING.longCarry : 0);

  const labor =
    input.helpersNeeded * PRICING.helperEach +
    (input.hasFragileItems ? PRICING.fragile : 0);

  // Percentage add-ons scale with the core job size, computed on the pre-addon
  // subtotal so they don't compound with each other.
  const core = base + distance + access + labor;
  const addons =
    (input.assemblyRequired ? core * PRICING.assemblyPct : 0) +
    (input.packingIncluded ? core * PRICING.packingPct : 0);

  const point = (core + addons) * timingMultiplier(input.scheduledAt);

  return {
    min: roundCLP(point * PRICING.bandMin),
    mid: roundCLP(point),
    max: roundCLP(point * PRICING.bandMax),
    distanceKm: Math.round(routeKm * 10) / 10,
  };
}

// The acceptance window servers validate submitted quotes against — the same
// bounds POST /:id/quotes enforces, exposed here so the response a driver sees
// and the rule they're checked against can never diverge.
export function quoteAcceptableWindow(fair: PriceRange): { min: number; max: number } {
  return {
    min: roundCLP(fair.min * QUOTE_FLOOR_FACTOR),
    max: roundCLP(fair.max * QUOTE_CEILING_FACTOR),
  };
}
