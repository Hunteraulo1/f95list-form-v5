import { Migration } from '@mikro-orm/migrations';

//? Nouvelle permission « manage.tags » (classement des tags sur ceux de F95zone, /admin/tags) : donnée
//? aux rôles qui peuvent déjà gérer les rôles.
export class Migration20260921170000_add_manage_tags_permission extends Migration {
  override name = 'Migration20260921170000_add_manage_tags_permission';

  override async up(): Promise<void> {
    await this.execute(
      "insert ignore into `role_permission` (`role_id`, `permission`) select distinct `role_id`, 'manage.tags' from `role_permission` where `permission` = 'manage.roles'",
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      "delete from `role_permission` where `permission` = 'manage.tags'",
    );
  }
}
