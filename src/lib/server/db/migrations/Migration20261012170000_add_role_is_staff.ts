import { Migration } from '@mikro-orm/migrations';

//? `role.is_staff` : le rôle fait partie de l'équipe (liste « L'équipe » de l'accueil), réglable sur
//? /admin/roles. Jusqu'ici déduit de l'accès à l'administration, que les modérateurs n'ont pas.
export class Migration20261012170000_add_role_is_staff extends Migration {
  override name = 'Migration20261012170000_add_role_is_staff';

  override async up(): Promise<void> {
    this.addSql(
      'alter table `role` add `is_staff` tinyint(1) not null default false;',
    );
    this.addSql(
      "update `role` set `is_staff` = true where `name` in ('superadmin', 'moderator') or `id` in (select `role_id` from `role_permission` where `permission` = 'admin.access');",
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table `role` drop column `is_staff`;');
  }
}
