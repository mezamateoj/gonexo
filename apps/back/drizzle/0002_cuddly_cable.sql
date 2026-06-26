ALTER TABLE `driver_profile` ADD `license_url` text;--> statement-breakpoint
ALTER TABLE `driver_profile` ADD `vehicle_photos` text;--> statement-breakpoint
ALTER TABLE `driver_profile` ADD `papers_url` text;--> statement-breakpoint
ALTER TABLE `driver_profile` ADD `vehicle_description` text;--> statement-breakpoint
ALTER TABLE `driver_profile` ADD `vehicle_capacity` text;--> statement-breakpoint
ALTER TABLE `driver_profile` ADD `documents_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `job` ADD `confirm_code` text;--> statement-breakpoint
ALTER TABLE `job` ADD `confirm_code_used_at` integer;--> statement-breakpoint
ALTER TABLE `quote` ADD `price_min` integer;--> statement-breakpoint
ALTER TABLE `quote` ADD `price_max` integer;