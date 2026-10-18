ALTER TABLE `comments` ADD `kind` text DEFAULT 'message' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `priority` text DEFAULT 'normal' NOT NULL;