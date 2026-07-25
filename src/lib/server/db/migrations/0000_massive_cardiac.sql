CREATE TABLE `game` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`link` varchar(2048) NOT NULL,
	`website` varchar(36) NOT NULL,
	`thread_id` mediumint unsigned,
	`version` varchar(32) NOT NULL,
	`image` varchar(2048),
	`tags` text NOT NULL,
	`description` text,
	`description_fr` text,
	`auto_check` boolean NOT NULL,
	`active` boolean NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (NOW()),
	`updated_at` datetime NOT NULL DEFAULT (NOW()),
	CONSTRAINT `game_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_edition` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`version` varchar(32) NOT NULL,
	`status` enum('in_progress','completed','abandoned','on_hold') NOT NULL,
	`auto_check` boolean NOT NULL,
	`last_auto_check` datetime,
	`active` boolean NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (NOW()),
	`updated_at` datetime NOT NULL DEFAULT (NOW()),
	CONSTRAINT `game_edition_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_translation` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`version` varchar(32) NOT NULL,
	`link` varchar(2048) NOT NULL,
	`file` char(36) NOT NULL,
	`quality` enum('automatic','partial-proofreading','full-proofreading','original-french','unrated','not-working') NOT NULL,
	`type` enum('no_translation','integrated','translation','translation_with_mods','mods'),
	`active` boolean NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (NOW()),
	`updated_at` datetime NOT NULL DEFAULT (NOW()),
	CONSTRAINT `game_translation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_translation_translator` (
	`game_translation_id` char(36) NOT NULL,
	`translator_id` char(36) NOT NULL,
	`alert` boolean NOT NULL DEFAULT true,
	`type` enum('translator','proofreader'),
	CONSTRAINT `game_translation_translator_game_translation_id_translator_id_pk` PRIMARY KEY(`game_translation_id`,`translator_id`)
);
--> statement-breakpoint
CREATE TABLE `origin-website` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`website` varchar(32) NOT NULL,
	`link` varchar(2048) NOT NULL,
	`image` varchar(2048) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (NOW()),
	`updated_at` datetime NOT NULL DEFAULT (NOW()),
	CONSTRAINT `origin-website_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translator` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`name` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`discord_id` varchar(36),
	`active` boolean NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (NOW()),
	`updated_at` datetime NOT NULL DEFAULT (NOW()),
	CONSTRAINT `translator_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translator_link` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`translator_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`link` varchar(2048) NOT NULL,
	`order` tinyint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (NOW()),
	`updated_at` datetime NOT NULL DEFAULT (NOW()),
	CONSTRAINT `translator_link_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` char(36) NOT NULL DEFAULT (UUID()),
	`discordNotification` boolean NOT NULL DEFAULT true,
	CONSTRAINT `user_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `game` ADD CONSTRAINT `game_website_origin-website_id_fk` FOREIGN KEY (`website`) REFERENCES `origin-website`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_translation_translator` ADD CONSTRAINT `game_translation_translator_translation_fk` FOREIGN KEY (`game_translation_id`) REFERENCES `game_translation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `game_translation_translator` ADD CONSTRAINT `game_translation_translator_translator_fk` FOREIGN KEY (`translator_id`) REFERENCES `translator`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `translator` ADD CONSTRAINT `translator_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `translator_link` ADD CONSTRAINT `translator_link_translator_id_translator_id_fk` FOREIGN KEY (`translator_id`) REFERENCES `translator`(`id`) ON DELETE no action ON UPDATE no action;