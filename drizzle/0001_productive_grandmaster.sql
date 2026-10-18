CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`project` text,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`key` text NOT NULL,
	`kind` text NOT NULL,
	`purpose` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient` text NOT NULL,
	`project` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`target` text NOT NULL,
	`created` text NOT NULL,
	`read_at` text,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `avatar` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `website` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `showcase` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `finished` text;