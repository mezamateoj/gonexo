// Masks an exact address down to a "zone" — street name (no house number) plus
// comuna — shown to drivers before they win the job. Both our seed format
// ("Calle 123, Comuna, Santiago") and Mapbox's verbose format
// ("Calle, Comuna, Region 7500000, Chile") place the comuna at segment index 1.

export function maskAddress(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return "Zona reservada"
  // Drop house/unit numbers from the street segment.
  const street = parts[0].replace(/\d[\d.\-/]*/g, "").replace(/\s{2,}/g, " ").trim()
  const comuna = parts[1]
  if (!street && comuna) return comuna
  return comuna ? `${street}, ${comuna}` : street || "Zona reservada"
}
