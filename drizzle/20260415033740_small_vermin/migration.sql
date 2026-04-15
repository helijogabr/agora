ALTER TABLE `likes` RENAME COLUMN `post` TO `postId`;--> statement-breakpoint
ALTER TABLE `likes` RENAME COLUMN `user` TO `userId`;--> statement-breakpoint
ALTER TABLE `posts` RENAME COLUMN `author` TO `authorId`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL UNIQUE,
	`password` text NOT NULL,
	`city` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`role` text
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `name`, `password`, `city`, `createdAt`, `updatedAt`, `role`) SELECT `id`, `name`, `password`, `city`, `createdAt`, `updatedAt`, `role` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `users_name_unique`;