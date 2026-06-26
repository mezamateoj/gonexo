ALTER TABLE `request` ADD `flexible_date` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `request` ADD `budget_max` integer;--> statement-breakpoint
ALTER TABLE `request` ADD `helpers_needed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `request` ADD `has_fragile_items` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `request` ADD `assembly_required` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `request` ADD `packing_included` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `request` ADD `parking_type` text DEFAULT 'street' NOT NULL;--> statement-breakpoint
ALTER TABLE `request` ADD `long_carry` integer DEFAULT false NOT NULL;