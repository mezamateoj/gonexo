DROP TABLE IF EXISTS `__new_request`;
-- Drizzle's D1 HTTP driver must send this migration as one batch so deferred foreign keys stay active.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE `__new_request` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`origin_address` text NOT NULL,
	`origin_lat` real NOT NULL,
	`origin_lng` real NOT NULL,
	`origin_floor` integer,
	`origin_has_elevator` integer DEFAULT false NOT NULL,
	`dest_address` text NOT NULL,
	`dest_lat` real NOT NULL,
	`dest_lng` real NOT NULL,
	`dest_floor` integer,
	`dest_has_elevator` integer DEFAULT false NOT NULL,
	`scheduled_at` integer NOT NULL,
	`flexible_date` integer DEFAULT false NOT NULL,
	`volume_category` text NOT NULL,
	`item_description` text NOT NULL,
	`notes` text,
	`budget_max` integer,
	`helpers_needed` integer DEFAULT 0 NOT NULL,
	`has_fragile_items` integer DEFAULT false NOT NULL,
	`assembly_required` integer DEFAULT false NOT NULL,
	`packing_included` integer DEFAULT false NOT NULL,
	`parking_type` text DEFAULT 'street' NOT NULL,
	`long_carry` integer DEFAULT false NOT NULL,
	`route_distance_m` integer,
	`route_duration_s` integer,
	`zero_quote_notified_at` integer,
	`expiry_remind_notified_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "request_status_check" CHECK("status" in ('open', 'accepted', 'in_progress', 'completed', 'cancelled'))
);

INSERT INTO `__new_request`("id", "user_id", "status", "origin_address", "origin_lat", "origin_lng", "origin_floor", "origin_has_elevator", "dest_address", "dest_lat", "dest_lng", "dest_floor", "dest_has_elevator", "scheduled_at", "flexible_date", "volume_category", "item_description", "notes", "budget_max", "helpers_needed", "has_fragile_items", "assembly_required", "packing_included", "parking_type", "long_carry", "route_distance_m", "route_duration_s", "zero_quote_notified_at", "expiry_remind_notified_at", "created_at", "updated_at") SELECT "id", "user_id", "status", "origin_address", "origin_lat", "origin_lng", "origin_floor", "origin_has_elevator", "dest_address", "dest_lat", "dest_lng", "dest_floor", "dest_has_elevator", "scheduled_at", "flexible_date", "volume_category", "item_description", "notes", "budget_max", "helpers_needed", "has_fragile_items", "assembly_required", "packing_included", "parking_type", "long_carry", "route_distance_m", "route_duration_s", NULL, NULL, "created_at", "updated_at" FROM `request`;
DROP TABLE `request`;
ALTER TABLE `__new_request` RENAME TO `request`;
CREATE INDEX `request_userId_idx` ON `request` (`user_id`);
CREATE INDEX `request_status_scheduledAt_idx` ON `request` (`status`,`scheduled_at`);
CREATE INDEX `request_status_createdAt_idx` ON `request` (`status`,`created_at`);
CREATE INDEX `request_status_routeDistanceM_idx` ON `request` (`status`,`route_distance_m`);
CREATE TABLE `__new_quote` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`price` integer NOT NULL,
	`price_min` integer,
	`price_max` integer,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `request`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "quote_status_check" CHECK("status" in ('pending', 'accepted', 'rejected', 'expired', 'cancelled'))
);

INSERT INTO `__new_quote`("id", "request_id", "driver_id", "price", "price_min", "price_max", "message", "status", "expires_at", "created_at", "updated_at") SELECT "id", "request_id", "driver_id", "price", "price_min", "price_max", "message", "status", "expires_at", "created_at", "updated_at" FROM `quote`;
DROP TABLE `quote`;
ALTER TABLE `__new_quote` RENAME TO `quote`;
CREATE UNIQUE INDEX `quote_request_driver_unique` ON `quote` (`request_id`,`driver_id`);
CREATE UNIQUE INDEX `quote_one_accepted_per_request_unique` ON `quote` (`request_id`) WHERE "quote"."status" = 'accepted';
CREATE INDEX `quote_requestId_idx` ON `quote` (`request_id`);
CREATE INDEX `quote_driverId_idx` ON `quote` (`driver_id`);
CREATE INDEX `quote_pending_expiresAt_idx` ON `quote` (`expires_at`) WHERE "quote"."status" = 'pending';
CREATE TABLE `__new_job` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`quote_id` text NOT NULL,
	`user_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`agreed_price` integer NOT NULL,
	`platform_fee` integer NOT NULL,
	`driver_payout` integer NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`on_the_way_at` integer,
	`arrived_at` integer,
	`completed_at` integer,
	`auto_confirm_at` integer,
	`confirmed_at` integer,
	`cancelled_at` integer,
	`cancelled_by_role` text,
	`confirm_code` text,
	`confirm_code_used_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `request`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`quote_id`) REFERENCES `quote`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`driver_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "job_status_check" CHECK("status" in ('scheduled', 'on_the_way', 'arrived', 'completed', 'cancelled')),
	CONSTRAINT "job_payment_status_check" CHECK("payment_status" in ('pending', 'held', 'released', 'refunded')),
	CONSTRAINT "job_cancelled_by_role_check" CHECK("cancelled_by_role" is null or "cancelled_by_role" in ('user', 'driver'))
);

INSERT INTO `__new_job`("id", "request_id", "quote_id", "user_id", "driver_id", "status", "agreed_price", "platform_fee", "driver_payout", "payment_status", "on_the_way_at", "arrived_at", "completed_at", "auto_confirm_at", "confirmed_at", "cancelled_at", "cancelled_by_role", "confirm_code", "confirm_code_used_at", "created_at", "updated_at") SELECT "id", "request_id", "quote_id", "user_id", "driver_id", "status", "agreed_price", "platform_fee", "driver_payout", "payment_status", "on_the_way_at", "arrived_at", "completed_at", "auto_confirm_at", "confirmed_at", NULL, NULL, "confirm_code", "confirm_code_used_at", "created_at", "updated_at" FROM `job`;
DROP TABLE `job`;
ALTER TABLE `__new_job` RENAME TO `job`;
CREATE UNIQUE INDEX `job_quote_id_unique` ON `job` (`quote_id`);
CREATE INDEX `job_userId_idx` ON `job` (`user_id`);
CREATE INDEX `job_driverId_idx` ON `job` (`driver_id`);
CREATE INDEX `job_status_idx` ON `job` (`status`);
CREATE UNIQUE INDEX `job_one_active_per_request_unique` ON `job` (`request_id`) WHERE "job"."status" != 'cancelled';
CREATE INDEX `job_pending_autoConfirmAt_idx` ON `job` (`auto_confirm_at`) WHERE "job"."confirmed_at" is null;
CREATE TABLE `__new_review` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`reviewee_id` text NOT NULL,
	`reviewer_role` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "review_rating_check" CHECK("rating" >= 1 and "rating" <= 5),
	CONSTRAINT "review_reviewer_role_check" CHECK("reviewer_role" in ('user', 'driver'))
);

INSERT INTO `__new_review`("id", "job_id", "reviewer_id", "reviewee_id", "reviewer_role", "rating", "comment", "created_at") SELECT "id", "job_id", "reviewer_id", "reviewee_id", "reviewer_role", "rating", "comment", "created_at" FROM `review`;
DROP TABLE `review`;
ALTER TABLE `__new_review` RENAME TO `review`;
CREATE UNIQUE INDEX `review_job_reviewer_unique` ON `review` (`job_id`,`reviewer_id`);
CREATE INDEX `review_jobId_idx` ON `review` (`job_id`);
CREATE INDEX `review_revieweeId_idx` ON `review` (`reviewee_id`);
CREATE TABLE `__new_driver_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phone` text NOT NULL,
	`vehicle_type` text NOT NULL,
	`vehicle_plate` text NOT NULL,
	`vehicle_year` integer,
	`bio` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`avg_rating` real,
	`total_jobs` integer DEFAULT 0 NOT NULL,
	`vehicle_description` text,
	`vehicle_capacity` text,
	`documents_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "driver_profile_vehicle_type_check" CHECK("vehicle_type" in ('van', 'pickup', 'truck_small', 'truck_large')),
	CONSTRAINT "driver_profile_documents_status_check" CHECK("documents_status" in ('pending', 'submitted', 'verified')),
	CONSTRAINT "driver_profile_vehicle_year_check" CHECK("vehicle_year" is null or ("vehicle_year" >= 1990 and "vehicle_year" <= 2035)),
	CONSTRAINT "driver_profile_rating_check" CHECK("avg_rating" is null or ("avg_rating" >= 1 and "avg_rating" <= 5)),
	CONSTRAINT "driver_profile_total_jobs_check" CHECK("total_jobs" >= 0),
	CONSTRAINT "driver_profile_verified_status_check" CHECK("is_verified" = false or "documents_status" = 'verified')
);

INSERT INTO `__new_driver_profile`("id", "user_id", "phone", "vehicle_type", "vehicle_plate", "vehicle_year", "bio", "is_verified", "is_available", "avg_rating", "total_jobs", "vehicle_description", "vehicle_capacity", "documents_status", "created_at", "updated_at") SELECT "id", "user_id", "phone", "vehicle_type", "vehicle_plate", "vehicle_year", "bio", "is_verified", "is_available", "avg_rating", "total_jobs", "vehicle_description", "vehicle_capacity", "documents_status", "created_at", "updated_at" FROM `driver_profile`;
DROP TABLE `driver_profile`;
ALTER TABLE `__new_driver_profile` RENAME TO `driver_profile`;
CREATE UNIQUE INDEX `driver_profile_user_id_unique` ON `driver_profile` (`user_id`);
CREATE UNIQUE INDEX `driver_profile_vehicle_plate_unique` ON `driver_profile` (`vehicle_plate`);
CREATE TABLE `driver_document` (
	`id` text PRIMARY KEY NOT NULL,
	`driver_profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`driver_profile_id`) REFERENCES `driver_profile`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "driver_document_kind_check" CHECK("driver_document"."kind" in ('license', 'papers', 'vehicle_photo'))
);

CREATE INDEX `driver_document_driverProfileId_idx` ON `driver_document` (`driver_profile_id`);
CREATE UNIQUE INDEX `driver_document_key_unique` ON `driver_document` (`key`);
CREATE TABLE `job_event` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`type` text NOT NULL,
	`actor_role` text NOT NULL,
	`meta` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "job_event_actor_role_check" CHECK("job_event"."actor_role" in ('system', 'user', 'driver', 'operator'))
);

CREATE INDEX `job_event_jobId_idx` ON `job_event` (`job_id`);
CREATE TABLE `job_report` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`reporter_id` text NOT NULL,
	`reporter_role` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "job_report_reporter_role_check" CHECK("job_report"."reporter_role" in ('user', 'driver'))
);

CREATE INDEX `job_report_jobId_idx` ON `job_report` (`job_id`);
PRAGMA defer_foreign_keys=OFF;
PRAGMA optimize;
