import { randomUUID } from 'node:crypto';
import { Migration } from '@mikro-orm/migrations';

//? Toutes les permissions du catalogue au moment de la migration, écrites en dur : le rôle admin
//? les avait implicitement (rôle tout-puissant), il les reçoit maintenant explicitement pour ne
//? rien perdre, et devient un rôle ordinaire que seul le super admin peut régler.
const ADMIN_PERMISSIONS = [
  'admin.access',
  'manage.game',
  'manage.users',
  'users.view_email',
  'manage.roles',
  'manage.api',
];

export class Migration20260920160000_add_superadmin_remove_author extends Migration {
  override name = 'Migration20260920160000_add_superadmin_remove_author';

  override async up(): Promise<void> {
    const [author] = await this.execute(
      "select id from role where name = 'author'",
    );
    if (author) {
      const [{ users }] = await this.execute(
        'select count(*) as users from `user` where role_id = ?',
        [author.id],
      );
      if (Number(users) > 0) {
        throw new Error(
          `Le rôle « author » est encore attribué à ${users} utilisateur(s) : les changer de rôle avant.`,
        );
      }
      //? Ses permissions partent avec lui (clé étrangère en cascade).
      await this.execute('delete from role where id = ?', [author.id]);
    }

    await this.execute(
      "insert into role (id, name, label, priority, is_system, api_key_limit, api_daily_quota) values (?, 'superadmin', 'Super admin', 1000, true, 50, 10000)",
      [randomUUID()],
    );

    const [admin] = await this.execute(
      "select id from role where name = 'admin'",
    );
    if (admin) {
      for (const permission of ADMIN_PERMISSIONS) {
        await this.execute(
          'insert ignore into role_permission (role_id, permission) values (?, ?)',
          [admin.id, permission],
        );
      }
    }
  }

  override async down(): Promise<void> {
    const [admin] = await this.execute(
      "select id from role where name = 'admin'",
    );
    if (admin) {
      await this.execute('delete from role_permission where role_id = ?', [
        admin.id,
      ]);
    }

    //? Échoue (clé étrangère) tant que des utilisateurs sont super admin : les rétrograder avant.
    await this.execute("delete from role where name = 'superadmin'");
    await this.execute(
      "insert into role (id, name, label, priority, is_system, api_key_limit, api_daily_quota) values (?, 'author', 'Auteur', 20, true, 20, 750)",
      [randomUUID()],
    );
  }
}
