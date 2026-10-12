import { Migration } from '@mikro-orm/migrations';

//? Nouvelle permission « content.activation » (activer ou désactiver un jeu, une édition ou une
//? traduction, depuis la fiche du jeu) : donnée aux rôles qui peuvent déjà gérer les rôles.
export class Migration20261012130000_add_content_activation_permission extends Migration {
  override name = 'Migration20261012130000_add_content_activation_permission';

  override async up(): Promise<void> {
    await this.execute(
      "insert ignore into `role_permission` (`role_id`, `permission`) select distinct `role_id`, 'content.activation' from `role_permission` where `permission` = 'manage.roles'",
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      "delete from `role_permission` where `permission` = 'content.activation'",
    );
  }
}
