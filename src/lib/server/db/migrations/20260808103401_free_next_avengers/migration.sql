CREATE TABLE `game_tags` (
	`id` mediumint unsigned AUTO_INCREMENT PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`link` varchar(2048) NOT NULL,
	`website` varchar(36) NOT NULL,
	`thread_id` mediumint unsigned,
	`image_internal` varchar(2048),
	`image_external` varchar(2048),
	`tags` text NOT NULL,
	`description` text,
	`description_fr` text,
	`auto_check` boolean NOT NULL,
	`active` boolean NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_tags_website_origin-website_id_fkey` FOREIGN KEY (`website`) REFERENCES `origin-website`(`id`)
);
--> statement-breakpoint
ALTER TABLE `game_edition` MODIFY COLUMN `name` varchar(255);--> statement-breakpoint
ALTER TABLE `translator` MODIFY COLUMN `user_id` varchar(36);--> statement-breakpoint
ALTER TABLE `game_edition` DROP COLUMN `version`;--> statement-breakpoint
ALTER TABLE `game_edition` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `game_edition` DROP COLUMN `auto_check`;--> statement-breakpoint
ALTER TABLE `game_edition` DROP COLUMN `last_auto_check`;--> statement-breakpoint
ALTER TABLE `game_edition` DROP COLUMN `active`;