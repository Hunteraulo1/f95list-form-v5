import { Migration } from '@mikro-orm/migrations';

//? Curseur personnalisé des profils (`user.cursor`), comme en v4, derrière la permission
//? « profile.cursor » : donnée aux rôles qui ont déjà l'image de fond du profil.
export class Migration20261012210000_add_profile_cursor extends Migration {
  override name = 'Migration20261012210000_add_profile_cursor';

  override async up(): Promise<void> {
    this.addSql('alter table `user` add `cursor` varchar(2048) null;');
    this.addSql(
      "insert ignore into `role_permission` (`role_id`, `permission`) select distinct `role_id`, 'profile.cursor' from `role_permission` where `permission` = 'profile.background'",
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      "delete from `role_permission` where `permission` = 'profile.cursor'",
    );
    this.addSql('alter table `user` drop column `cursor`;');
  }
}
