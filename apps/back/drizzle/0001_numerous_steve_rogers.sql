CREATE TABLE `driver_profile` (
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
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `driver_profile_user_id_unique` ON `driver_profile` (`user_id`);--> statement-breakpoint
CREATE TABLE `job` (
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
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `request`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`quote_id`) REFERENCES `quote`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`driver_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_request_id_unique` ON `job` (`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `job_quote_id_unique` ON `job` (`quote_id`);--> statement-breakpoint
CREATE INDEX `job_userId_idx` ON `job` (`user_id`);--> statement-breakpoint
CREATE INDEX `job_driverId_idx` ON `job` (`driver_id`);--> statement-breakpoint
CREATE INDEX `job_status_idx` ON `job` (`status`);--> statement-breakpoint
CREATE TABLE `quote` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`price` integer NOT NULL,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `request`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quote_request_driver_unique` ON `quote` (`request_id`,`driver_id`);--> statement-breakpoint
CREATE INDEX `quote_requestId_idx` ON `quote` (`request_id`);--> statement-breakpoint
CREATE INDEX `quote_driverId_idx` ON `quote` (`driver_id`);--> statement-breakpoint
CREATE TABLE `request` (
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
	`volume_category` text NOT NULL,
	`item_description` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `request_userId_idx` ON `request` (`user_id`);--> statement-breakpoint
CREATE INDEX `request_status_scheduledAt_idx` ON `request` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE TABLE `request_photo` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`url` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `request`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `request_photo_requestId_idx` ON `request_photo` (`request_id`);--> statement-breakpoint
CREATE TABLE `review` (
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
	FOREIGN KEY (`reviewee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_job_reviewer_unique` ON `review` (`job_id`,`reviewer_id`);--> statement-breakpoint
CREATE INDEX `review_jobId_idx` ON `review` (`job_id`);--> statement-breakpoint
CREATE INDEX `review_revieweeId_idx` ON `review` (`reviewee_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `phone` text;