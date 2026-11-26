CREATE TABLE `bookings` (
	`code` text PRIMARY KEY NOT NULL,
	`tour_id` text NOT NULL,
	`tour_title` text NOT NULL,
	`date` text NOT NULL,
	`people` integer NOT NULL,
	`customer` text NOT NULL,
	`phone` text NOT NULL,
	`total` integer NOT NULL,
	`sample` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "booking_status" CHECK("bookings"."status" IN ('pending', 'confirmed', 'cancelled')),
	CONSTRAINT "booking_people" CHECK("bookings"."people" BETWEEN 1 AND 20)
);
--> statement-breakpoint
CREATE INDEX `bookings_by_date` ON `bookings` (`created_at`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tours` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`location` text NOT NULL,
	`days` integer NOT NULL,
	`price` integer NOT NULL,
	`summary` text NOT NULL,
	`itinerary` text NOT NULL,
	`included` text NOT NULL,
	`image` text NOT NULL,
	`sample` integer DEFAULT false NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "tour_category" CHECK("tours"."category" IN ('domestic', 'international')),
	CONSTRAINT "tour_days" CHECK("tours"."days" BETWEEN 1 AND 30),
	CONSTRAINT "tour_price" CHECK("tours"."price" BETWEEN 1000 AND 1000000000)
);
