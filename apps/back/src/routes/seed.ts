import { Hono } from "hono"
import type { AppEnv } from "../lib/types"
import { createAuth } from "../lib/auth"
import { driverProfile, request, quote, job } from "../db/schema"
import { eq } from "drizzle-orm"

const seed = new Hono<AppEnv>()

// ─── Static data ─────────────────────────────────────────────────────────────

const CLIENTS = [
  { email: "maria@gonexo.cl",     name: "María González",   password: "seed1234" },
  { email: "ana@gonexo.cl",       name: "Ana Sepúlveda",    password: "seed1234" },
  { email: "diego@gonexo.cl",     name: "Diego Rojas",      password: "seed1234" },
  { email: "valentina@gonexo.cl", name: "Valentina Castro", password: "seed1234" },
  { email: "roberto@gonexo.cl",   name: "Roberto Morales",  password: "seed1234" },
]

const DRIVERS = [
  { email: "carlos@gonexo.cl",  name: "Carlos Méndez",  password: "seed1234" },
  { email: "pamela@gonexo.cl",  name: "Pamela Soto",    password: "seed1234" },
]

const COMMUNES = [
  { name: "Providencia",     street: "Av. Providencia",              lat: -33.4316, lng: -70.6093 },
  { name: "Las Condes",      street: "Av. Las Condes",               lat: -33.4106, lng: -70.5736 },
  { name: "Ñuñoa",           street: "Av. Irarrázaval",              lat: -33.4584, lng: -70.5981 },
  { name: "Vitacura",        street: "Av. Vitacura",                 lat: -33.3855, lng: -70.5850 },
  { name: "Maipú",           street: "Av. Pajaritos",                lat: -33.5101, lng: -70.7604 },
  { name: "San Miguel",      street: "Gran Avenida",                 lat: -33.4989, lng: -70.6546 },
  { name: "La Florida",      street: "Av. Vicuña Mackenna",          lat: -33.5234, lng: -70.5994 },
  { name: "Santiago Centro", street: "Av. O'Higgins",                lat: -33.4489, lng: -70.6693 },
  { name: "Macul",           street: "Av. Macul",                    lat: -33.4880, lng: -70.5889 },
  { name: "Lo Barnechea",    street: "Av. Barnechea",                lat: -33.3520, lng: -70.5235 },
  { name: "Pudahuel",        street: "Av. Las Rejas",                lat: -33.4392, lng: -70.7634 },
  { name: "Quilicura",       street: "Av. Américo Vespucio Norte",   lat: -33.3549, lng: -70.7295 },
  { name: "Independencia",   street: "Av. Independencia",            lat: -33.4173, lng: -70.6561 },
  { name: "Recoleta",        street: "Av. Recoleta",                 lat: -33.4068, lng: -70.6360 },
  { name: "La Cisterna",     street: "Gran Avenida",                 lat: -33.5273, lng: -70.6649 },
  { name: "Peñalolén",       street: "Av. Grecia",                   lat: -33.4775, lng: -70.5250 },
  { name: "Lo Prado",        street: "Av. Lo Prado",                 lat: -33.4395, lng: -70.7208 },
  { name: "Cerrillos",       street: "Av. Pedro Aguirre Cerda",      lat: -33.4940, lng: -70.7192 },
  { name: "El Bosque",       street: "Av. La Pintana",               lat: -33.5609, lng: -70.6631 },
  { name: "Quinta Normal",   street: "Av. Mapocho",                  lat: -33.4472, lng: -70.7058 },
  { name: "Huechuraba",      street: "Av. El Salto",                 lat: -33.3663, lng: -70.6505 },
  { name: "Cerro Navia",     street: "Av. Cerro Navia",              lat: -33.4280, lng: -70.7397 },
  { name: "Renca",           street: "Av. Renca",                    lat: -33.4034, lng: -70.7214 },
  { name: "La Granja",       street: "Av. La Granja",                lat: -33.5260, lng: -70.6271 },
]

const ITEMS_SMALL = [
  "Escritorio y silla de oficina, 3 cajas de libros",
  "Cama de 1 plaza, velador y lámpara",
  "Televisor 55\", consola y rack",
  "Refrigerador pequeño y microondas",
  "Bicicleta, rodado 29, desmontada",
  "5 cajas de ropa y artículos personales",
  "Sofá de 2 cuerpos y mesa de centro",
  "Guitarra, amplificador y pedalera",
  "Impresora, monitor 27\" y accesorios de oficina",
  "Cama de 1½ plazas y cajonera",
]

const ITEMS_MEDIUM = [
  "Pieza amoblada: cama doble, cómoda, velador y escritorio",
  "Comedor de 6 personas y buffet",
  "Living completo: sofá de 3 cuerpos, sillones y mesa de centro",
  "2 dormitorios de niños: literas, escritorios y juguetes",
  "Cocina equipada: refrigerador, lavadora y muebles",
  "Cama king y vestidor con espejo",
  "Sala de estar: TV 65\", muebles y decoración",
  "Home office completo: escritorio en L, silla gamer, estantes",
  "Pieza matrimonial: cama, cómoda y mesa de noche",
  "Equipamiento de gimnasio casero: multiestación y pesas",
]

const ITEMS_LARGE = [
  "Departamento de 2 dormitorios: living, comedor, 2 piezas y cocina",
  "Departamento amoblado: todos los muebles de 65 m²",
  "Piso completo con piano de cola incluido",
  "Bodega de negocio: estantes, cajas y equipamiento",
  "Departamento dúplex: muebles de 2 pisos",
  "Oficina completa: escritorios, sillas y archiveros",
  "Departamento con electrodomésticos incluidos",
  "Casa pequeña: 3 habitaciones sin garage",
  "Local comercial: mobiliario y equipos",
  "Departamento amoblado 70 m², sin artículos frágiles",
]

const ITEMS_FULL = [
  "Mudanza completa de casa de 3 dormitorios, 2 baños y jardín",
  "Casa familiar: living, comedor, 4 piezas, cocina y bodega",
  "Mudanza de 150 m²: todos los ambientes incluyendo lavadero",
  "Casa con garage: autos no incluidos, sí el taller",
  "Mudanza familiar con piano, obra de arte y bodega",
  "Casa de 4 dormitorios con muebles de jardín incluidos",
  "Mudanza empresarial: oficinas de 200 m²",
  "Casa con piscina desmontable y quinchos",
  "Mudanza completa 3 pisos, incluye sótano y bodega",
  "Casa antigua con muebles de madera pesada",
]

const NOTES_POOL = [
  "Hay estacionamiento disponible en la calle frente al edificio.",
  "El acceso al edificio es por la calle posterior.",
  "Confirmar llegada con 30 min de anticipación.",
  "Portería disponible de 8:00 a 20:00.",
  "Calle con tráfico pesado en hora punta, preferir mañana.",
  "El dueño estará presente durante la mudanza.",
  "Hay un perro en la casa, no morder.",
  "Requiere estacionamiento de camión grande, hay espacio.",
  "Edificio con conserje, avisar con anticipación.",
  "Fecha tentativa, puede adelantarse si hay disponibilidad.",
  null, null, null, // ~30% sin notas
]

const PARKING_TYPES = ["street", "street", "street", "garage", "loading_dock"] as const

const VOLUMES = ["small", "medium", "large", "full_move"] as const

const BUDGET_BY_VOLUME = {
  small:     [20000, 25000, 30000, 35000, 40000, 50000, 60000],
  medium:    [45000, 55000, 65000, 80000, 95000, 110000, 120000],
  large:     [90000, 110000, 130000, 150000, 180000, 200000],
  full_move: [160000, 200000, 250000, 300000, 350000, 420000, 450000],
}

const HOURS = [8, 9, 10, 11, 14, 15, 16, 17]
const FLOORS = [null, null, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12]

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]
}

function bool(i: number, divisor: number): boolean {
  return i % divisor === 0
}

function buildAddress(commune: typeof COMMUNES[0], num: number): string {
  return `${commune.street} ${num}, ${commune.name}, Santiago`
}

// ─── Route ───────────────────────────────────────────────────────────────────

seed.post("/", async (c) => {
  const db = c.get("db")
  const auth = createAuth(db)

  // Idempotency — bail if already seeded
  const existing = await db.select().from(driverProfile).where(eq(driverProfile.id, "seed-dp-carlos-001")).get()
  if (existing) {
    return c.json({ ok: true, already: true, credentials: { clients: CLIENTS, drivers: DRIVERS } })
  }

  // ── 1. Create users ──────────────────────────────────────────────────────
  const clientUsers = await Promise.all(
    CLIENTS.map((c) => auth.api.signUpEmail({ body: c }))
  )
  const driverUsers = await Promise.all(
    DRIVERS.map((d) => auth.api.signUpEmail({ body: d }))
  )

  const clientIds = clientUsers.map((u) => u.user.id)
  const [carlosId, pamelaId] = driverUsers.map((u) => u.user.id)

  const now = new Date()
  const expiry = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // ── 2. Driver profiles ───────────────────────────────────────────────────
  await db.insert(driverProfile).values([
    {
      id: "seed-dp-carlos-001",
      userId: carlosId,
      phone: "+56912345678",
      vehicleType: "van",
      vehiclePlate: "KPZF80",
      isVerified: true,
      isAvailable: true,
      avgRating: 4.8,
      totalJobs: 23,
      documentsStatus: "verified",
      vehicleDescription: "Furgón Mercedes Sprinter 2019. Capacidad para mudanzas medianas. Incluye mantas de protección.",
      vehicleCapacity: "12 m³ — ideal para departamentos de 2-3 piezas",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-dp-pamela-001",
      userId: pamelaId,
      phone: "+56987654321",
      vehicleType: "truck_small",
      vehiclePlate: "FGBX21",
      isVerified: true,
      isAvailable: true,
      avgRating: 4.6,
      totalJobs: 11,
      documentsStatus: "verified",
      vehicleDescription: "Camión mediano Hyundai 2021. Experiencia en mudanzas completas.",
      vehicleCapacity: "22 m³ — ideal para casas de 3-4 dormitorios",
      createdAt: now,
      updatedAt: now,
    },
  ])

  // ── 3. Generate 110 requests ─────────────────────────────────────────────
  const requests = Array.from({ length: 110 }, (_, i) => {
    const originIdx = i % COMMUNES.length
    const destIdx   = (i + Math.floor(i / COMMUNES.length) + 3) % COMMUNES.length === originIdx
      ? (i + 5) % COMMUNES.length
      : (i + Math.floor(i / COMMUNES.length) + 3) % COMMUNES.length

    const origin  = COMMUNES[originIdx]
    const dest    = COMMUNES[destIdx]
    const vol     = pick(VOLUMES, i)
    const userId  = pick(clientIds, i)

    const itemsByVol = {
      small:     ITEMS_SMALL,
      medium:    ITEMS_MEDIUM,
      large:     ITEMS_LARGE,
      full_move: ITEMS_FULL,
    }
    const items   = pick(itemsByVol[vol], Math.floor(i / VOLUMES.length))
    const budgets = BUDGET_BY_VOLUME[vol]
    const budget  = bool(i, 3) ? null : pick(budgets, i)

    const daysAhead   = (i % 28) + 1
    const hour        = pick(HOURS, i)
    const scheduledAt = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    scheduledAt.setHours(hour, 0, 0, 0)

    const originFloor = pick(FLOORS, i)
    const destFloor   = pick(FLOORS, i + 7)

    const createdOffset = (i * 3600 * 1000) // stagger created times
    const createdAt = new Date(now.getTime() - createdOffset)

    return {
      id: `seed-req-bulk-${String(i + 1).padStart(3, "0")}`,
      userId,
      status: "open" as const,
      originAddress: buildAddress(origin, 100 + i * 23),
      originLat:     origin.lat + (i % 5) * 0.001,
      originLng:     origin.lng + (i % 7) * 0.001,
      originFloor,
      originHasElevator: originFloor !== null && bool(i, 2),
      destAddress:   buildAddress(dest, 200 + i * 17),
      destLat:       dest.lat + (i % 6) * 0.001,
      destLng:       dest.lng + (i % 4) * 0.001,
      destFloor:     destFloor,
      destHasElevator: destFloor !== null && bool(i, 3),
      scheduledAt,
      flexibleDate:     bool(i, 3),
      volumeCategory:   vol,
      itemDescription:  items,
      notes:            pick(NOTES_POOL, i + 2),
      budgetMax:        budget,
      helpersNeeded:    i % 4 === 0 ? 2 : i % 4 === 1 ? 1 : 0,
      hasFragileItems:  bool(i, 5),
      assemblyRequired: bool(i, 4),
      packingIncluded:  bool(i, 7),
      longCarry:        bool(i, 9),
      parkingType:      pick(PARKING_TYPES, i),
      createdAt,
      updatedAt: createdAt,
    }
  })

  // D1 hard limit: 100 bound parameters per statement.
  // 27 columns × N rows in one values([...]) call exceeds this fast.
  // db.batch() sends each as its own statement (27 params each) in one round-trip.
  const STMT_BATCH = 100
  for (let start = 0; start < requests.length; start += STMT_BATCH) {
    const stmts = requests.slice(start, start + STMT_BATCH).map((r) => db.insert(request).values(r))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.batch(stmts as [any, ...any[]])
  }

  // ── 4. A few anchor requests with richer state ───────────────────────────
  const anchorId1 = "seed-req-anchor-001"
  const anchorId2 = "seed-req-anchor-002"
  const anchorId3 = "seed-req-anchor-003"

  const anchor1 = {
    id: anchorId1,
    userId: clientIds[0],
    status: "open" as const,
    originAddress: "Av. Providencia 1234, Providencia, Santiago",
    originLat: -33.4316, originLng: -70.6093,
    originFloor: 4, originHasElevator: true,
    destAddress: "Av. Las Condes 5678, Las Condes, Santiago",
    destLat: -33.4106, destLng: -70.5736,
    destFloor: null, destHasElevator: false,
    scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    flexibleDate: false,
    volumeCategory: "medium" as const,
    itemDescription: "Cama king, vestidor de 4 puertas y mesas de noche",
    notes: "Cuidado con el espejo del vestidor",
    budgetMax: 85000,
    helpersNeeded: 1,
    hasFragileItems: true,
    assemblyRequired: true,
    packingIncluded: false,
    longCarry: false,
    parkingType: "garage" as const,
    createdAt: now, updatedAt: now,
  }
  const anchor2 = {
    id: anchorId2,
    userId: clientIds[1],
    status: "open" as const,
    originAddress: "Av. Vitacura 3456, Vitacura, Santiago",
    originLat: -33.3855, originLng: -70.5850,
    originFloor: 8, originHasElevator: true,
    destAddress: "Av. Irarrázaval 890, Ñuñoa, Santiago",
    destLat: -33.4584, destLng: -70.5981,
    destFloor: 2, destHasElevator: false,
    scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    flexibleDate: true,
    volumeCategory: "full_move" as const,
    itemDescription: "Mudanza completa de departamento de 3 dormitorios, 110 m²",
    notes: "Edificio con portería, avisar al llegar. Estacionamiento disponible en subterráneo.",
    budgetMax: 320000,
    helpersNeeded: 2,
    hasFragileItems: true,
    assemblyRequired: true,
    packingIncluded: true,
    longCarry: false,
    parkingType: "garage" as const,
    createdAt: now, updatedAt: now,
  }
  const anchor3 = {
    id: anchorId3,
    userId: clientIds[2],
    status: "accepted" as const,
    originAddress: "Gran Avenida 1200, San Miguel, Santiago",
    originLat: -33.4989, originLng: -70.6546,
    originFloor: null, originHasElevator: false,
    destAddress: "Av. Pajaritos 2300, Maipú, Santiago",
    destLat: -33.5101, destLng: -70.7604,
    destFloor: null, destHasElevator: false,
    scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    flexibleDate: false,
    volumeCategory: "large" as const,
    itemDescription: "Casa pequeña 2 dormitorios: living, comedor y cocina amoblada",
    notes: null,
    budgetMax: 150000,
    helpersNeeded: 1,
    hasFragileItems: false,
    assemblyRequired: false,
    packingIncluded: false,
    longCarry: false,
    parkingType: "street" as const,
    createdAt: now, updatedAt: now,
  }
  await db.batch([
    db.insert(request).values(anchor1),
    db.insert(request).values(anchor2),
    db.insert(request).values(anchor3),
  ])

  // ── 5. Quotes on anchor requests ─────────────────────────────────────────
  const q1Id = "seed-q-anchor-001"
  const q2Id = "seed-q-anchor-002"
  const q3Id = "seed-q-anchor-003"

  await db.insert(quote).values([
    {
      id: q1Id,
      requestId: anchorId1,
      driverId: carlosId,
      price: 75000,
      message: "Furgón disponible, tengo experiencia con vestidores. Incluye 1 ayudante.",
      status: "pending",
      expiresAt: expiry,
      createdAt: now, updatedAt: now,
    },
    {
      id: q2Id,
      requestId: anchorId1,
      driverId: pamelaId,
      price: 80000,
      message: "Camión mediano con espacio suficiente. Incluyo materiales de embalaje para el espejo.",
      status: "pending",
      expiresAt: expiry,
      createdAt: now, updatedAt: now,
    },
    {
      id: q3Id,
      requestId: anchorId3,
      driverId: carlosId,
      price: 135000,
      message: "Disponible mañana. Camión grande para la casa completa.",
      status: "accepted",
      expiresAt: expiry,
      createdAt: now, updatedAt: now,
    },
  ])

  // ── 6. Job from accepted anchor quote ────────────────────────────────────
  const agreedPrice = 135000
  const platformFee = Math.round(agreedPrice * 0.12)
  await db.insert(job).values({
    id: "seed-job-anchor-001",
    requestId: anchorId3,
    quoteId: q3Id,
    userId: clientIds[2],
    driverId: carlosId,
    status: "scheduled",
    agreedPrice,
    platformFee,
    driverPayout: agreedPrice - platformFee,
    paymentStatus: "pending",
    createdAt: now, updatedAt: now,
  })

  return c.json({
    ok: true,
    credentials: {
      clients: CLIENTS.map(({ name, email, password }) => ({ name, email, password })),
      drivers: DRIVERS.map(({ name, email, password }) => ({ name, email, password })),
    },
    summary: {
      users: CLIENTS.length + DRIVERS.length,
      requests: requests.length + 3,
      quotes: 3,
      jobs: 1,
    },
  })
})

export default seed
