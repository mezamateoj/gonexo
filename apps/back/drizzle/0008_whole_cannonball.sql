CREATE TABLE `document_review` (
	`id` text PRIMARY KEY NOT NULL,
	`driver_profile_id` text NOT NULL,
	`account_name` text NOT NULL,
	`vehicle_plate` text NOT NULL,
	`documents` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`result` text,
	`analysis_attempts` integer DEFAULT 0 NOT NULL,
	`analysis_started_at` integer,
	`analyzed_at` integer,
	`admin_notification_attempted_at` integer,
	`reviewer_id` text,
	`decision` text,
	`reviewed_at` integer,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`driver_profile_id`) REFERENCES `driver_profile`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "document_review_status_check" CHECK("document_review"."status" in ('queued', 'analyzing', 'ready', 'analysis_failed', 'enqueue_failed', 'superseded')),
	CONSTRAINT "document_review_decision_check" CHECK("document_review"."decision" is null or "document_review"."decision" in ('verified', 'changes_requested'))
);
--> statement-breakpoint
CREATE INDEX `document_review_driverProfileId_createdAt_idx` ON `document_review` (`driver_profile_id`,`created_at`);