CREATE UNIQUE INDEX `account_provider_account_unique` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
UPDATE `user`
SET `phone` = CASE
	WHEN `phone` IS NULL THEN NULL
	WHEN substr(replace(replace(replace(replace(replace(trim(`phone`), ' ', ''), '-', ''), '.', ''), '(', ''), ')', ''), 1, 1) = '+'
		THEN replace(replace(replace(replace(replace(trim(`phone`), ' ', ''), '-', ''), '.', ''), '(', ''), ')', '')
	ELSE '+' || replace(replace(replace(replace(replace(trim(`phone`), ' ', ''), '-', ''), '.', ''), '(', ''), ')', '')
END;--> statement-breakpoint
UPDATE `driver_profile`
SET
	`phone` = CASE
		WHEN substr(replace(replace(replace(replace(replace(trim(`phone`), ' ', ''), '-', ''), '.', ''), '(', ''), ')', ''), 1, 1) = '+'
			THEN replace(replace(replace(replace(replace(trim(`phone`), ' ', ''), '-', ''), '.', ''), '(', ''), ')', '')
		ELSE '+' || replace(replace(replace(replace(replace(trim(`phone`), ' ', ''), '-', ''), '.', ''), '(', ''), ')', '')
	END,
	`vehicle_plate` = upper(replace(replace(trim(`vehicle_plate`), ' ', ''), '-', ''));--> statement-breakpoint
WITH duplicate_plates AS (
	SELECT
		`id`,
		`vehicle_plate`,
		row_number() OVER (PARTITION BY `vehicle_plate` ORDER BY `created_at`, `id`) AS duplicate_number
	FROM `driver_profile`
)
UPDATE `driver_profile`
SET `vehicle_plate` = substr(`vehicle_plate`, 1, 8) || printf('%02d', (
	SELECT `duplicate_number` FROM duplicate_plates WHERE duplicate_plates.`id` = `driver_profile`.`id`
))
WHERE `id` IN (
	SELECT `id` FROM duplicate_plates WHERE `duplicate_number` > 1
);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`license_url` text,
	`vehicle_photos` text,
	`papers_url` text,
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
--> statement-breakpoint
INSERT INTO `__new_driver_profile`("id", "user_id", "phone", "vehicle_type", "vehicle_plate", "vehicle_year", "bio", "is_verified", "is_available", "avg_rating", "total_jobs", "license_url", "vehicle_photos", "papers_url", "vehicle_description", "vehicle_capacity", "documents_status", "created_at", "updated_at") SELECT "id", "user_id", "phone", "vehicle_type", "vehicle_plate", "vehicle_year", "bio", "is_verified", "is_available", "avg_rating", "total_jobs", "license_url", "vehicle_photos", "papers_url", "vehicle_description", "vehicle_capacity", "documents_status", "created_at", "updated_at" FROM `driver_profile`;--> statement-breakpoint
DROP TABLE `driver_profile`;--> statement-breakpoint
ALTER TABLE `__new_driver_profile` RENAME TO `driver_profile`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `driver_profile_user_id_unique` ON `driver_profile` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `driver_profile_vehicle_plate_unique` ON `driver_profile` (`vehicle_plate`);--> statement-breakpoint
CREATE UNIQUE INDEX `quote_one_accepted_per_request_unique` ON `quote` (`request_id`) WHERE "quote"."status" = 'accepted';--> statement-breakpoint
CREATE UNIQUE INDEX `user_phone_unique` ON `user` (`phone`);
