CREATE TABLE `calculator_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_name` text,
	`sku` text,
	`purchase_price` real NOT NULL,
	`results_json` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`address` text NOT NULL,
	`icloud_account` text,
	`provider` text,
	`retailers` text DEFAULT '[]',
	`status` text DEFAULT 'active',
	`notes` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer,
	`name` text NOT NULL,
	`category` text,
	`purchase_price` real NOT NULL,
	`status` text DEFAULT 'in_stock',
	`listed_url` text,
	`listed_price` real,
	`sold_price` real,
	`sold_date` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bot_name` text,
	`product` text NOT NULL,
	`size` text,
	`price` real NOT NULL,
	`store` text,
	`profile` text,
	`order_number` text,
	`success` integer,
	`raw_data` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `price_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text,
	`product_name` text NOT NULL,
	`target_price` real NOT NULL,
	`direction` text NOT NULL,
	`marketplace` text,
	`active` integer DEFAULT true,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tracker_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`category` text,
	`date` integer NOT NULL,
	`tags` text DEFAULT '[]',
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `vault_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site` text NOT NULL,
	`username` text NOT NULL,
	`password_ciphertext` blob NOT NULL,
	`password_iv` text NOT NULL,
	`notes_ciphertext` blob,
	`notes_iv` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `vccs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text,
	`last_four` text NOT NULL,
	`label` text,
	`linked_account_id` integer,
	`status` text DEFAULT 'active',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`linked_account_id`) REFERENCES `emails`(`id`) ON UPDATE no action ON DELETE no action
);
