CREATE TABLE `follow_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`student` text NOT NULL,
	`mentor` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `follow_pair` ON `follow_requests` (`student`,`mentor`);--> statement-breakpoint
CREATE TABLE `project_members` (
	`project` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`invited_by` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`project`, `email`),
	FOREIGN KEY (`project`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE VIEW `project_access` AS 
 SELECT project,email,role,status FROM project_members
 UNION ALL SELECT p.id,p.student,'student','accepted' FROM projects p WHERE p.student!='' AND NOT EXISTS(SELECT 1 FROM project_members m WHERE m.project=p.id AND m.email=p.student)
 UNION ALL SELECT p.id,p.mentor,'mentor','accepted' FROM projects p WHERE p.mentor!='' AND NOT EXISTS(SELECT 1 FROM project_members m WHERE m.project=p.id AND m.email=p.mentor)
;