-- D1 must execute this migration as one batch. Back up child tables because
-- dropping job applies ON DELETE CASCADE even with deferred foreign keys.
PRAGMA defer_foreign_keys=ON;

CREATE TABLE `__backup_job_event` AS SELECT * FROM `job_event`;
CREATE TABLE `__backup_job_report` AS SELECT * FROM `job_report`;
CREATE TABLE `__backup_review` AS SELECT * FROM `review`;
DROP TABLE `job_event`;
DROP TABLE `job_report`;
DROP TABLE `review`;

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
	`mercado_pago_preference_id` text,
	`mercado_pago_payment_id` text,
	`paid_at` integer,
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
	CONSTRAINT "job_status_check" CHECK(`status` in ('scheduled', 'on_the_way', 'arrived', 'completed', 'cancelled')),
	CONSTRAINT "job_payment_status_check" CHECK(`payment_status` in ('not_required', 'pending', 'approved', 'refunded', 'charged_back')),
	CONSTRAINT "job_cancelled_by_role_check" CHECK(`cancelled_by_role` is null or `cancelled_by_role` in ('user', 'driver'))
);

INSERT INTO `__new_job`(
	`id`, `request_id`, `quote_id`, `user_id`, `driver_id`, `status`,
	`agreed_price`, `platform_fee`, `driver_payout`, `payment_status`,
	`mercado_pago_preference_id`, `mercado_pago_payment_id`, `paid_at`,
	`on_the_way_at`, `arrived_at`, `completed_at`, `auto_confirm_at`,
	`confirmed_at`, `cancelled_at`, `cancelled_by_role`, `confirm_code`,
	`confirm_code_used_at`, `created_at`, `updated_at`
)
SELECT
	`id`, `request_id`, `quote_id`, `user_id`, `driver_id`, `status`,
	`agreed_price`, `platform_fee`, `driver_payout`, 'not_required',
	NULL, NULL, NULL,
	`on_the_way_at`, `arrived_at`, `completed_at`, `auto_confirm_at`,
	`confirmed_at`, `cancelled_at`, `cancelled_by_role`, `confirm_code`,
	`confirm_code_used_at`, `created_at`, `updated_at`
FROM `job`;

DROP TABLE `job`;
ALTER TABLE `__new_job` RENAME TO `job`;
CREATE UNIQUE INDEX `job_quote_id_unique` ON `job` (`quote_id`);
CREATE UNIQUE INDEX `job_mercado_pago_preference_id_unique` ON `job` (`mercado_pago_preference_id`);
CREATE UNIQUE INDEX `job_mercado_pago_payment_id_unique` ON `job` (`mercado_pago_payment_id`);
CREATE INDEX `job_userId_idx` ON `job` (`user_id`);
CREATE INDEX `job_driverId_idx` ON `job` (`driver_id`);
CREATE INDEX `job_status_idx` ON `job` (`status`);
CREATE UNIQUE INDEX `job_one_active_per_request_unique` ON `job` (`request_id`) WHERE `status` != 'cancelled';
CREATE INDEX `job_pending_autoConfirmAt_idx` ON `job` (`auto_confirm_at`) WHERE `confirmed_at` is null;

CREATE TABLE `job_event` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`type` text NOT NULL,
	`actor_role` text NOT NULL,
	`meta` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "job_event_actor_role_check" CHECK(`actor_role` in ('system', 'user', 'driver', 'operator'))
);
INSERT INTO `job_event` SELECT * FROM `__backup_job_event`;
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
	CONSTRAINT "job_report_reporter_role_check" CHECK(`reporter_role` in ('user', 'driver'))
);
INSERT INTO `job_report` SELECT * FROM `__backup_job_report`;
CREATE INDEX `job_report_jobId_idx` ON `job_report` (`job_id`);

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
	FOREIGN KEY (`reviewee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "review_rating_check" CHECK(`rating` >= 1 and `rating` <= 5),
	CONSTRAINT "review_reviewer_role_check" CHECK(`reviewer_role` in ('user', 'driver'))
);
INSERT INTO `review` SELECT * FROM `__backup_review`;
CREATE UNIQUE INDEX `review_job_reviewer_unique` ON `review` (`job_id`,`reviewer_id`);
CREATE INDEX `review_jobId_idx` ON `review` (`job_id`);
CREATE INDEX `review_revieweeId_idx` ON `review` (`reviewee_id`);

DROP TABLE `__backup_job_event`;
DROP TABLE `__backup_job_report`;
DROP TABLE `__backup_review`;

CREATE TABLE `mercado_pago_payment` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`external_reference` text NOT NULL,
	`status` text NOT NULL,
	`status_detail` text,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`live_mode` integer NOT NULL,
	`provider_created_at` integer,
	`provider_approved_at` integer,
	`provider_updated_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `job`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `mercado_pago_payment_jobId_idx` ON `mercado_pago_payment` (`job_id`);
