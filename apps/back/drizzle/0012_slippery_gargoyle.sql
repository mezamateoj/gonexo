-- Keep this migration in one D1 batch. Deferral does not suppress CASCADE.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE `__asap_request_photos` AS SELECT * FROM `request_photo`;
CREATE TABLE `__asap_quotes` AS SELECT * FROM `quote`;
CREATE TABLE `__new_request` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`republished_from_id` text,
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
	`schedule_type` text DEFAULT 'scheduled' NOT NULL,
	`scheduled_at` integer,
	`expires_at` integer,
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
	`admin_no_quote_notified_at` integer,
	`admin_expiry_notified_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`republished_from_id`) REFERENCES `__new_request`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "request_status_check" CHECK("__new_request"."status" in ('open', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired')),
	CONSTRAINT "request_schedule_check" CHECK(("__new_request"."schedule_type" = 'scheduled' and "__new_request"."scheduled_at" is not null and "__new_request"."expires_at" is null) or ("__new_request"."schedule_type" = 'asap' and "__new_request"."scheduled_at" is null and "__new_request"."expires_at" is not null and "__new_request"."flexible_date" = false))
);
INSERT INTO `__new_request`("id", "user_id", "status", "republished_from_id", "origin_address", "origin_lat", "origin_lng", "origin_floor", "origin_has_elevator", "dest_address", "dest_lat", "dest_lng", "dest_floor", "dest_has_elevator", "schedule_type", "scheduled_at", "expires_at", "flexible_date", "volume_category", "item_description", "notes", "budget_max", "helpers_needed", "has_fragile_items", "assembly_required", "packing_included", "parking_type", "long_carry", "route_distance_m", "route_duration_s", "zero_quote_notified_at", "expiry_remind_notified_at", "admin_no_quote_notified_at", "admin_expiry_notified_at", "created_at", "updated_at") SELECT "id", "user_id", "status", "republished_from_id", "origin_address", "origin_lat", "origin_lng", "origin_floor", "origin_has_elevator", "dest_address", "dest_lat", "dest_lng", "dest_floor", "dest_has_elevator", 'scheduled', "scheduled_at", NULL, "flexible_date", "volume_category", "item_description", "notes", "budget_max", "helpers_needed", "has_fragile_items", "assembly_required", "packing_included", "parking_type", "long_carry", "route_distance_m", "route_duration_s", "zero_quote_notified_at", "expiry_remind_notified_at", "admin_no_quote_notified_at", "admin_expiry_notified_at", "created_at", "updated_at" FROM `request`;
DROP TABLE `request`;
ALTER TABLE `__new_request` RENAME TO `request`;
INSERT INTO `request_photo` SELECT * FROM `__asap_request_photos`;
INSERT INTO `quote` SELECT * FROM `__asap_quotes`;
DROP TABLE `__asap_request_photos`;
DROP TABLE `__asap_quotes`;
CREATE INDEX `request_userId_idx` ON `request` (`user_id`);
CREATE INDEX `request_status_scheduledAt_idx` ON `request` (`status`,`scheduled_at`);
CREATE INDEX `request_open_expiresAt_idx` ON `request` (`expires_at`) WHERE "request"."status" = 'open';
CREATE INDEX `request_status_createdAt_idx` ON `request` (`status`,`created_at`);
CREATE INDEX `request_status_routeDistanceM_idx` ON `request` (`status`,`route_distance_m`);
CREATE UNIQUE INDEX `request_republishedFromId_unique` ON `request` (`republished_from_id`);
PRAGMA defer_foreign_keys=OFF;
