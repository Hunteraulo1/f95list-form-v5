CREATE TABLE `game_game_tags` (
	`game_id` mediumint unsigned NOT NULL,
	`game_tag_id` mediumint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT PRIMARY KEY(`game_id`,`game_tag_id`),
	CONSTRAINT `game_game_tags_game_fk` FOREIGN KEY (`game_id`) REFERENCES `game`(`id`),
	CONSTRAINT `game_game_tags_game_tag_fk` FOREIGN KEY (`game_tag_id`) REFERENCES `game_tags`(`id`)
);
--> statement-breakpoint
ALTER TABLE `game_tags` DROP CONSTRAINT `game_tags_website_origin-website_id_fkey`;--> statement-breakpoint
DROP INDEX `game_tags_website_origin-website_id_fkey` ON `game_tags`--> statement-breakpoint
ALTER TABLE `game_translation_file` MODIFY COLUMN `external_link` varchar(2048);--> statement-breakpoint
ALTER TABLE `game_translation_file` MODIFY COLUMN `internal_link` varchar(2048);--> statement-breakpoint
ALTER TABLE `game_edition` ADD `version` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `game_edition` ADD `status` enum('in_progress','completed','abandoned','on_hold') NOT NULL;--> statement-breakpoint
ALTER TABLE `game_edition` ADD `auto_check` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `game_edition` ADD `last_auto_check` datetime;--> statement-breakpoint
ALTER TABLE `game_edition` ADD `active` boolean NOT NULL;--> statement-breakpoint
ALTER TABLE `game` DROP COLUMN `tags`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `link`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `website`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `thread_id`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `image_internal`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `image_external`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `tags`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `description_fr`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `auto_check`;--> statement-breakpoint
ALTER TABLE `game_tags` DROP COLUMN `active`;