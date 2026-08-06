ALTER TABLE `game_translation` DROP CONSTRAINT `game_translation_file_id_game_translation_file_id_fkey`;--> statement-breakpoint
DROP INDEX `game_translation_file_id_game_translation_file_id_fkey` ON `game_translation`--> statement-breakpoint
ALTER TABLE `game_edition` ADD `game_id` mediumint unsigned NOT NULL;--> statement-breakpoint
ALTER TABLE `game_translation` ADD `game_edition_id` char(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `game_translation_file` ADD `game_translation_id` char(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `role_id` char(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `game_edition` ADD CONSTRAINT `game_edition_game_id_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `game`(`id`);--> statement-breakpoint
ALTER TABLE `game_translation` ADD CONSTRAINT `game_translation_game_edition_id_game_edition_id_fkey` FOREIGN KEY (`game_edition_id`) REFERENCES `game_edition`(`id`);--> statement-breakpoint
ALTER TABLE `game_translation_file` ADD CONSTRAINT `game_translation_file_q2YzPs4xJIF9_fkey` FOREIGN KEY (`game_translation_id`) REFERENCES `game_translation`(`id`);--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_role_id_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`);--> statement-breakpoint
ALTER TABLE `game_translation` DROP COLUMN `file_id`;