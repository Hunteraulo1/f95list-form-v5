import { Migration } from '@mikro-orm/migrations';

//? Image de fond et musique des profils (`user.background`, `user.music`), comme en v4, chacune
//? derrière sa permission (« profile.background », « profile.music ») : données aux rôles staff.
export class Migration20261012190000_add_profile_background_music extends Migration {
  override name = 'Migration20261012190000_add_profile_background_music';

  override async up(): Promise<void> {
    this.addSql(
      'alter table `user` add `background` varchar(2048) null, add `music` varchar(2048) null;',
    );
    for (const permission of ['profile.background', 'profile.music']) {
      this.addSql(
        `insert ignore into \`role_permission\` (\`role_id\`, \`permission\`) select \`id\`, '${permission}' from \`role\` where \`is_staff\` = true and \`name\` <> 'superadmin'`,
      );
    }
  }

  override async down(): Promise<void> {
    this.addSql(
      "delete from `role_permission` where `permission` in ('profile.background', 'profile.music')",
    );
    this.addSql(
      'alter table `user` drop column `background`, drop column `music`;',
    );
  }
}
