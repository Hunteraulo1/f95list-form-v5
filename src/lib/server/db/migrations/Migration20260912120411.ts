import { Migration } from '@mikro-orm/migrations';

export class Migration20260912120411 extends Migration {
  override name = 'Migration20260912120411';

  override up(): void | Promise<void> {
    this.addSql(
      `create table \`config\` (\`id\` tinyint unsigned not null auto_increment primary key, \`name\` varchar(255) not null, \`maintenance_mode\` tinyint(1) not null default false, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp()) default character set utf8mb4 engine = InnoDB;`,
    );

    this.addSql(
      `create table \`game_tags\` (\`id\` mediumint unsigned not null auto_increment primary key, \`name\` varchar(255) not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp()) default character set utf8mb4 engine = InnoDB;`,
    );

    this.addSql(
      `create table \`origin-website\` (\`id\` char(36) not null, \`name\` varchar(32) not null, \`link\` varchar(2048) not null, \`image\` varchar(2048) not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );

    this.addSql(
      `create table \`game\` (\`id\` mediumint unsigned not null auto_increment primary key, \`name\` varchar(255) not null, \`link\` varchar(2048) not null, \`website\` char(36) not null, \`thread_id\` mediumint unsigned null, \`image_internal\` varchar(2048) null, \`image_external\` varchar(2048) null, \`description\` text null, \`description_fr\` text null, \`auto_check\` tinyint(1) not null, \`active\` tinyint(1) not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp()) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`game\` add index \`game_website_index\` (\`website\`);`,
    );

    this.addSql(
      `create table \`game_game_tags\` (\`game_id\` mediumint unsigned not null, \`game_tag_id\` mediumint unsigned not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`game_id\`, \`game_tag_id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`game_game_tags\` add index \`game_game_tags_game_id_index\` (\`game_id\`);`,
    );
    this.addSql(
      `alter table \`game_game_tags\` add index \`game_game_tags_game_tag_id_index\` (\`game_tag_id\`);`,
    );

    this.addSql(
      `create table \`game_edition\` (\`id\` char(36) not null, \`game_id\` mediumint unsigned not null, \`name\` varchar(255) null, \`version\` varchar(36) not null, \`status\` enum('in_progress','completed','abandoned','on_hold') not null, \`auto_check\` tinyint(1) not null, \`last_auto_check\` datetime null, \`active\` tinyint(1) not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`game_edition\` add index \`game_edition_game_id_index\` (\`game_id\`);`,
    );

    this.addSql(
      `create table \`game_translation\` (\`id\` char(36) not null, \`game_edition_id\` char(36) not null, \`version\` varchar(36) not null, \`quality\` enum('automatic','partial-proofreading','full-proofreading','original-french','unrated','not-working') not null, \`type\` enum('no_translation','integrated','translation','translation_with_mods','mods') null, \`active\` tinyint(1) not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`game_translation\` add index \`game_translation_game_edition_id_index\` (\`game_edition_id\`);`,
    );

    this.addSql(
      `create table \`game_translation_file\` (\`id\` char(36) not null, \`game_translation_id\` char(36) not null, \`version\` varchar(36) not null, \`external_link\` varchar(2048) null, \`internal_link\` varchar(2048) null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`game_translation_file\` add index \`game_translation_file_game_translation_id_index\` (\`game_translation_id\`);`,
    );

    this.addSql(
      `create table \`role\` (\`id\` char(36) not null, \`name\` varchar(64) not null, \`label\` varchar(64) not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );

    this.addSql(
      `create table \`user\` (\`id\` char(36) not null, \`role_id\` char(36) not null, \`zitadel_id\` char(36) not null, \`discord_notification\` tinyint(1) not null default true, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`user\` add index \`user_role_id_index\` (\`role_id\`);`,
    );
    this.addSql(
      `alter table \`user\` add unique \`user_zitadel_id_unique\` (\`zitadel_id\`);`,
    );

    this.addSql(
      `create table \`translator\` (\`id\` char(36) not null, \`name\` varchar(255) not null, \`user_id\` char(36) null, \`discord_id\` varchar(36) null, \`active\` tinyint(1) not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`translator\` add index \`translator_user_id_index\` (\`user_id\`);`,
    );

    this.addSql(
      `create table \`translator_link\` (\`id\` char(36) not null, \`translator_id\` char(36) not null, \`name\` varchar(255) not null, \`link\` varchar(2048) not null, \`order\` tinyint unsigned not null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`translator_link\` add index \`translator_link_translator_id_index\` (\`translator_id\`);`,
    );

    this.addSql(
      `create table \`game_translation_translator\` (\`game_translation_id\` char(36) not null, \`translator_id\` char(36) not null, \`alert\` tinyint(1) not null default true, \`type\` enum('translator','proofreader') null, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`game_translation_id\`, \`translator_id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`game_translation_translator\` add index \`game_translation_translator_game_translation_id_index\` (\`game_translation_id\`);`,
    );
    this.addSql(
      `alter table \`game_translation_translator\` add index \`game_translation_translator_translator_id_index\` (\`translator_id\`);`,
    );

    this.addSql(
      `alter table \`game\` add constraint \`game_website_origin-website_id_fkey\` foreign key (\`website\`) references \`origin-website\` (\`id\`);`,
    );

    this.addSql(
      `alter table \`game_game_tags\` add constraint \`game_game_tags_game_fk\` foreign key (\`game_id\`) references \`game\` (\`id\`) on update restrict on delete cascade;`,
    );
    this.addSql(
      `alter table \`game_game_tags\` add constraint \`game_game_tags_game_tag_fk\` foreign key (\`game_tag_id\`) references \`game_tags\` (\`id\`) on update restrict on delete cascade;`,
    );

    this.addSql(
      `alter table \`game_edition\` add constraint \`game_edition_game_id_game_id_fkey\` foreign key (\`game_id\`) references \`game\` (\`id\`);`,
    );

    this.addSql(
      `alter table \`game_translation\` add constraint \`game_translation_game_edition_id_game_edition_id_fkey\` foreign key (\`game_edition_id\`) references \`game_edition\` (\`id\`);`,
    );

    this.addSql(
      `alter table \`game_translation_file\` add constraint \`game_translation_file_q2YzPs4xJIF9_fkey\` foreign key (\`game_translation_id\`) references \`game_translation\` (\`id\`);`,
    );

    this.addSql(
      `alter table \`user\` add constraint \`user_role_id_role_id_fkey\` foreign key (\`role_id\`) references \`role\` (\`id\`);`,
    );

    this.addSql(
      `alter table \`translator\` add constraint \`translator_user_id_user_id_fkey\` foreign key (\`user_id\`) references \`user\` (\`id\`) on delete restrict;`,
    );

    this.addSql(
      `alter table \`translator_link\` add constraint \`translator_link_translator_id_translator_id_fkey\` foreign key (\`translator_id\`) references \`translator\` (\`id\`);`,
    );

    this.addSql(
      `alter table \`game_translation_translator\` add constraint \`game_translation_translator_translation_fk\` foreign key (\`game_translation_id\`) references \`game_translation\` (\`id\`) on update restrict on delete cascade;`,
    );
    this.addSql(
      `alter table \`game_translation_translator\` add constraint \`game_translation_translator_translator_fk\` foreign key (\`translator_id\`) references \`translator\` (\`id\`) on update restrict on delete cascade;`,
    );
  }
}
