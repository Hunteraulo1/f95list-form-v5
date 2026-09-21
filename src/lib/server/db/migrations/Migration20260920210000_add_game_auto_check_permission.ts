import { Migration } from '@mikro-orm/migrations';

//? Nouvelle permission « game.auto_check » (étape « Auto-check » de l'ajout d'un jeu, comme la
//? permission games.auto_check de la v4) : donnée aux rôles qui peuvent déjà modifier les jeux.
export class Migration20260920210000_add_game_auto_check_permission extends Migration {
  override name = 'Migration20260920210000_add_game_auto_check_permission';

  override async up(): Promise<void> {
    await this.execute(
      "insert ignore into `role_permission` (`role_id`, `permission`) select distinct `role_id`, 'game.auto_check' from `role_permission` where `permission` = 'game.edit'",
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      "delete from `role_permission` where `permission` = 'game.auto_check'",
    );
  }
}
