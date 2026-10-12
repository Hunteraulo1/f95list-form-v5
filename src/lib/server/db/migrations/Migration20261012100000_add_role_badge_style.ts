import { Migration } from '@mikro-orm/migrations';

//? Couleur des rôles (`role.badge_style`, voir `$lib/role-style`), comme en v4 : réglable sur
//? /admin/roles. Les rôles qui portent un nom de la v4 reprennent la couleur qu'ils y avaient.
export class Migration20261012100000_add_role_badge_style extends Migration {
  override name = 'Migration20261012100000_add_role_badge_style';

  override async up(): Promise<void> {
    this.addSql(
      "alter table `role` add `badge_style` varchar(32) not null default 'default';",
    );
    this.addSql(
      "update `role` set `badge_style` = case `name` when 'translator' then 'primary' when 'moderator' then 'warning' when 'sysadmin' then 'secondary' when 'admin' then 'error' when 'superadmin' then 'superadmin' else 'default' end;",
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table `role` drop column `badge_style`;');
  }
}
