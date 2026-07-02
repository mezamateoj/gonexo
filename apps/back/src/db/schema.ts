import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, uniqueIndex, check } from "drizzle-orm/sqlite-core";

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .default(false)
      .notNull(),
    image: text("image"),
    phone: text("phone"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("user_phone_unique").on(table.phone)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_userId_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  driverProfile: one(driverProfile, {
    fields: [user.id],
    references: [driverProfile.userId],
  }),
  requests: many(request),
  quotes: many(quote),
  jobsAsUser: many(job, { relationName: "jobUser" }),
  jobsAsDriver: many(job, { relationName: "jobDriver" }),
  reviewsGiven: many(review, { relationName: "reviewer" }),
  reviewsReceived: many(review, { relationName: "reviewee" }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

// ─── Driver Profile ───────────────────────────────────────────────────────────
// A user becomes a driver by creating a profile. One user can be both
// a customer and a driver — role is inferred from whether this row exists.

export const driverProfile = sqliteTable(
  "driver_profile",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    vehicleType: text("vehicle_type").notNull(), // 'van' | 'pickup' | 'truck_small' | 'truck_large'
    vehiclePlate: text("vehicle_plate").notNull(),
    vehicleYear: integer("vehicle_year"),
    bio: text("bio"),
    isVerified: integer("is_verified", { mode: "boolean" }).default(false).notNull(),
    isAvailable: integer("is_available", { mode: "boolean" }).default(true).notNull(),
    avgRating: real("avg_rating"),         // cached, updated after every review
    totalJobs: integer("total_jobs").default(0).notNull(),

    // Verification docs + LLM-enriched vehicle profile
    licenseUrl: text("license_url"),
    vehiclePhotos: text("vehicle_photos"),       // JSON array of R2 URLs
    papersUrl: text("papers_url"),
    vehicleDescription: text("vehicle_description"), // LLM-generated, editable
    vehicleCapacity: text("vehicle_capacity"),       // LLM-generated, editable
    documentsStatus: text("documents_status").notNull().default("pending"),
    // 'pending' | 'submitted' | 'verified'
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("driver_profile_vehicle_plate_unique").on(t.vehiclePlate),
    check("driver_profile_vehicle_type_check", sql`${t.vehicleType} in ('van', 'pickup', 'truck_small', 'truck_large')`),
    check("driver_profile_documents_status_check", sql`${t.documentsStatus} in ('pending', 'submitted', 'verified')`),
    check("driver_profile_vehicle_year_check", sql`${t.vehicleYear} is null or (${t.vehicleYear} >= 1990 and ${t.vehicleYear} <= 2035)`),
    check("driver_profile_rating_check", sql`${t.avgRating} is null or (${t.avgRating} >= 1 and ${t.avgRating} <= 5)`),
    check("driver_profile_total_jobs_check", sql`${t.totalJobs} >= 0`),
    check("driver_profile_verified_status_check", sql`${t.isVerified} = false or ${t.documentsStatus} = 'verified'`),
  ],
);

export const driverProfileRelations = relations(driverProfile, ({ one }) => ({
  user: one(user, { fields: [driverProfile.userId], references: [user.id] }),
}));

// ─── Request ─────────────────────────────────────────────────────────────────
// A flete request posted by a customer. Lives until a job is created or
// the customer cancels it.
//
// status flow: open → accepted → in_progress → completed
//                  ↘ cancelled (any point before in_progress)

export const request = sqliteTable(
  "request",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    status: text("status").notNull().default("open"),
    // 'open' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

    // Origin
    originAddress: text("origin_address").notNull(),
    originLat: real("origin_lat").notNull(),
    originLng: real("origin_lng").notNull(),
    originFloor: integer("origin_floor"),          // null = ground level
    originHasElevator: integer("origin_has_elevator", { mode: "boolean" })
      .default(false)
      .notNull(),

    // Destination
    destAddress: text("dest_address").notNull(),
    destLat: real("dest_lat").notNull(),
    destLng: real("dest_lng").notNull(),
    destFloor: integer("dest_floor"),
    destHasElevator: integer("dest_has_elevator", { mode: "boolean" })
      .default(false)
      .notNull(),

    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }).notNull(),
    flexibleDate: integer("flexible_date", { mode: "boolean" }).default(false).notNull(),

    volumeCategory: text("volume_category").notNull(),
    // 'small' | 'medium' | 'large' | 'full_move'
    itemDescription: text("item_description").notNull(),
    notes: text("notes"),

    // Operational details — help drivers price accurately
    budgetMax: integer("budget_max"),                  // CLP, optional client max
    helpersNeeded: integer("helpers_needed").default(0).notNull(), // 0=driver only, 1-3
    hasFragileItems: integer("has_fragile_items", { mode: "boolean" }).default(false).notNull(),
    assemblyRequired: integer("assembly_required", { mode: "boolean" }).default(false).notNull(),
    packingIncluded: integer("packing_included", { mode: "boolean" }).default(false).notNull(),
    parkingType: text("parking_type").default("street").notNull(),
    // 'street' | 'garage' | 'loading_dock'
    longCarry: integer("long_carry", { mode: "boolean" }).default(false).notNull(),
    // true = >20m between truck and door

    // Real driving route, resolved once via Mapbox Directions at creation
    // (immutable for a request). Drives fair pricing and ETA display. Nullable:
    // null when Mapbox was unavailable or for rows predating this — pricing then
    // falls back to haversine × a circuity factor.
    routeDistanceM: integer("route_distance_m"),
    routeDurationS: integer("route_duration_s"),

    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("request_userId_idx").on(t.userId),
    index("request_status_scheduledAt_idx").on(t.status, t.scheduledAt),
  ],
);

export const requestRelations = relations(request, ({ one, many }) => ({
  user: one(user, { fields: [request.userId], references: [user.id] }),
  photos: many(requestPhoto),
  quotes: many(quote),
  job: one(job, { fields: [request.id], references: [job.requestId] }),
}));

// ─── Request Photo ────────────────────────────────────────────────────────────

export const requestPhoto = sqliteTable(
  "request_photo",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => request.id, { onDelete: "cascade" }),
    url: text("url").notNull(),       // R2 public URL
    order: integer("order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [index("request_photo_requestId_idx").on(t.requestId)],
);

export const requestPhotoRelations = relations(requestPhoto, ({ one }) => ({
  request: one(request, { fields: [requestPhoto.requestId], references: [request.id] }),
}));

// ─── Quote ───────────────────────────────────────────────────────────────────
// A driver's offer on an open request. Multiple drivers can quote the
// same request. Only one quote per driver per request is allowed.
//
// status flow: pending → accepted (user picks this one)
//                      → rejected (user picked another)
//                      → expired  (expiresAt passed, QStash job fires)

export const quote = sqliteTable(
  "quote",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => request.id, { onDelete: "cascade" }),
    driverId: text("driver_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    price: integer("price").notNull(),  // CLP — representative/agreed value; set on accept
    priceMin: integer("price_min"),     // range lower bound submitted by driver
    priceMax: integer("price_max"),     // range upper bound submitted by driver
    message: text("message"),
    status: text("status").notNull().default("pending"),
    // 'pending' | 'accepted' | 'rejected' | 'expired'

    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("quote_request_driver_unique").on(t.requestId, t.driverId),
    uniqueIndex("quote_one_accepted_per_request_unique").on(t.requestId).where(sql`${t.status} = 'accepted'`),
    index("quote_requestId_idx").on(t.requestId),
    index("quote_driverId_idx").on(t.driverId),
  ],
);

export const quoteRelations = relations(quote, ({ one }) => ({
  request: one(request, { fields: [quote.requestId], references: [request.id] }),
  driver: one(user, { fields: [quote.driverId], references: [user.id] }),
  job: one(job, { fields: [quote.id], references: [job.quoteId] }),
}));

// ─── Job ─────────────────────────────────────────────────────────────────────
// Created atomically when a user accepts a quote. Tracks the full
// lifecycle of the physical job and the payment state.
//
// status flow: scheduled → on_the_way → arrived → completed
//                        ↘ cancelled

export const job = sqliteTable(
  "job",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .unique()
      .references(() => request.id, { onDelete: "restrict" }),
    quoteId: text("quote_id")
      .notNull()
      .unique()
      .references(() => quote.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    driverId: text("driver_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),

    status: text("status").notNull().default("scheduled"),
    // 'scheduled' | 'on_the_way' | 'arrived' | 'completed' | 'cancelled'

    // Financials — copied from the accepted quote at creation time
    agreedPrice: integer("agreed_price").notNull(),   // CLP
    platformFee: integer("platform_fee").notNull(),   // CLP (~12%)
    driverPayout: integer("driver_payout").notNull(), // agreedPrice - platformFee

    paymentStatus: text("payment_status").notNull().default("pending"),
    // 'pending' | 'held' | 'released' | 'refunded'

    // Status timestamps (set as driver progresses through the job)
    onTheWayAt: integer("on_the_way_at", { mode: "timestamp_ms" }),
    arrivedAt: integer("arrived_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    autoConfirmAt: integer("auto_confirm_at", { mode: "timestamp_ms" }), // cron sweeps jobs past this
    confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }),

    // Rappi-style handoff code — client shows it, driver enters it to complete
    confirmCode: text("confirm_code"),
    confirmCodeUsedAt: integer("confirm_code_used_at", { mode: "timestamp_ms" }),

    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("job_userId_idx").on(t.userId),
    index("job_driverId_idx").on(t.driverId),
    index("job_status_idx").on(t.status),
  ],
);

export const jobRelations = relations(job, ({ one, many }) => ({
  request: one(request, { fields: [job.requestId], references: [request.id] }),
  quote: one(quote, { fields: [job.quoteId], references: [quote.id] }),
  user: one(user, {
    fields: [job.userId],
    references: [user.id],
    relationName: "jobUser",
  }),
  driver: one(user, {
    fields: [job.driverId],
    references: [user.id],
    relationName: "jobDriver",
  }),
  reviews: many(review),
}));

// ─── Review ───────────────────────────────────────────────────────────────────
// Both parties leave a review after job completion. One review per
// reviewer per job — enforced by the unique index.
// avgRating on driver_profile is updated (denormalised) after each insert.

export const review = sqliteTable(
  "review",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    revieweeId: text("reviewee_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reviewerRole: text("reviewer_role").notNull(), // 'user' | 'driver'
    rating: integer("rating").notNull(),           // 1–5
    comment: text("comment"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    uniqueIndex("review_job_reviewer_unique").on(t.jobId, t.reviewerId),
    index("review_jobId_idx").on(t.jobId),
    index("review_revieweeId_idx").on(t.revieweeId),
  ],
);

export const reviewRelations = relations(review, ({ one }) => ({
  job: one(job, { fields: [review.jobId], references: [job.id] }),
  reviewer: one(user, {
    fields: [review.reviewerId],
    references: [user.id],
    relationName: "reviewer",
  }),
  reviewee: one(user, {
    fields: [review.revieweeId],
    references: [user.id],
    relationName: "reviewee",
  }),
}));
