CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`project` text NOT NULL,
	`author` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`github` text NOT NULL,
	`student` text NOT NULL,
	`mentor` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project` text NOT NULL,
	`title` text NOT NULL,
	`due` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
