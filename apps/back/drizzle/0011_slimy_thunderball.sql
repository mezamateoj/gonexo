ALTER TABLE `request` ADD `republished_from_id` text REFERENCES request(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `request` ADD `admin_no_quote_notified_at` integer;--> statement-breakpoint
ALTER TABLE `request` ADD `admin_expiry_notified_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `request_republishedFromId_unique` ON `request` (`republished_from_id`);
