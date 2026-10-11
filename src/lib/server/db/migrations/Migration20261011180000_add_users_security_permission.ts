import { Migration } from '@mikro-orm/migrations';

//? Nouvelle permission « users.security » (retirer la double authentification d'un compte, lui envoyer
//? un e-mail de réinitialisation du mot de passe, depuis /admin/users) : donnée aux rôles qui peuvent
//? déjà gérer les rôles.
export class Migration20261011180000_add_users_security_permission extends Migration {
  override name = 'Migration20261011180000_add_users_security_permission';

  override async up(): Promise<void> {
    await this.execute(
      "insert ignore into `role_permission` (`role_id`, `permission`) select distinct `role_id`, 'users.security' from `role_permission` where `permission` = 'manage.roles'",
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      "delete from `role_permission` where `permission` = 'users.security'",
    );
  }
}
