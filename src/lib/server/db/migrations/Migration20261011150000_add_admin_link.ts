import { Migration } from '@mikro-orm/migrations';

//? Liens utiles de l'accueil de l'administration (table `admin_link`, réglés sur /admin/settings), et
//? permission « manage.settings » pour les régler : donnée aux rôles qui peuvent déjà gérer les rôles.
export class Migration20261011150000_add_admin_link extends Migration {
  override name = 'Migration20261011150000_add_admin_link';

  override async up(): Promise<void> {
    this.addSql(
      `create table \`admin_link\` (\`id\` char(36) not null, \`label\` varchar(64) not null, \`description\` varchar(255) null, \`url\` varchar(2048) not null, \`position\` int unsigned not null default 0, \`created_at\` datetime not null default current_timestamp(), \`updated_at\` datetime not null default current_timestamp() on update current_timestamp(), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      "insert ignore into `role_permission` (`role_id`, `permission`) select distinct `role_id`, 'manage.settings' from `role_permission` where `permission` = 'manage.roles'",
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      "delete from `role_permission` where `permission` = 'manage.settings'",
    );
    this.addSql(`drop table if exists \`admin_link\`;`);
  }
}
