CREATE TABLE `config` (
	`id` tinyint PRIMARY KEY DEFAULT 1,
	`name` varchar(255) NOT NULL,
	`maintenance_mode` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `game` (
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
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `game_edition` (
	`id` char(36) PRIMARY KEY DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`version` varchar(36) NOT NULL,
	`status` enum('in_progress','completed','abandoned','on_hold') NOT NULL,
	`auto_check` boolean NOT NULL,
	`last_auto_check` datetime,
	`active` boolean NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `game_translation` (
	`id` char(36) PRIMARY KEY DEFAULT (UUID()),
	`version` varchar(36) NOT NULL,
	`file_id` char(36) NOT NULL,
	`quality` enum('automatic','partial-proofreading','full-proofreading','original-french','unrated','not-working') NOT NULL,
	`type` enum('no_translation','integrated','translation','translation_with_mods','mods'),
	`active` boolean NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `game_translation_file` (
	`id` char(36) PRIMARY KEY DEFAULT (UUID()),
	`version` varchar(36) NOT NULL,
	`external_link` varchar(2048) NOT NULL,
	`internal_link` varchar(2048) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `game_translation_translator` (
	`game_translation_id` char(36) NOT NULL,
	`translator_id` char(36) NOT NULL,
	`alert` boolean NOT NULL DEFAULT true,
	`type` enum('translator','proofreader'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT PRIMARY KEY(`game_translation_id`,`translator_id`)
);
--> statement-breakpoint
CREATE TABLE `origin-website` (
	`id` char(36) PRIMARY KEY DEFAULT (UUID()),
	`name` varchar(32) NOT NULL,
	`link` varchar(2048) NOT NULL,
	`image` varchar(2048) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `role` (
	`id` char(36) PRIMARY KEY DEFAULT (UUID()),
	`name` varchar(64) NOT NULL,
	`label` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `translator` (
	`id` char(36) PRIMARY KEY DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`discord_id` varchar(36),
	`active` boolean NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `translator_link` (
	`id` char(36) PRIMARY KEY DEFAULT (UUID()),
	`translator_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`link` varchar(2048) NOT NULL,
	`order` tinyint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` char(36) PRIMARY KEY DEFAULT (UUID()),
	`zitadel_id` char(36) NOT NULL,
	`discord_notification` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zitadel_id_unique` UNIQUE INDEX(`zitadel_id`)
);
--> statement-breakpoint
ALTER TABLE `game` ADD CONSTRAINT `game_website_origin-website_id_fkey` FOREIGN KEY (`website`) REFERENCES `origin-website`(`id`);--> statement-breakpoint
ALTER TABLE `game_translation` ADD CONSTRAINT `game_translation_file_id_game_translation_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `game_translation_file`(`id`);--> statement-breakpoint
ALTER TABLE `game_translation_translator` ADD CONSTRAINT `game_translation_translator_translation_fk` FOREIGN KEY (`game_translation_id`) REFERENCES `game_translation`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `game_translation_translator` ADD CONSTRAINT `game_translation_translator_translator_fk` FOREIGN KEY (`translator_id`) REFERENCES `translator`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `translator` ADD CONSTRAINT `translator_user_id_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`);--> statement-breakpoint
ALTER TABLE `translator_link` ADD CONSTRAINT `translator_link_translator_id_translator_id_fkey` FOREIGN KEY (`translator_id`) REFERENCES `translator`(`id`);