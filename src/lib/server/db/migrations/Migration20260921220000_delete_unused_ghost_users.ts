import { Migration } from '@mikro-orm/migrations';

//? Supprime les comptes fantômes (sans zitadel_id ni e-mail) qui n'ont aucune traduction : des traducteurs
//? v4 que rien ne référençait, sans intérêt à revendiquer. Un fantôme qui a des pages (`user_link`) reste, et
//? est signalé : ce serait perdre des données. Un fantôme qui a un Discord est bien supprimé.
//? Seuls les rôles de priorité traducteur ou inférieure sont concernés : un admin pas encore relié à Zitadel
//? (compte créé à la main, ou DEV_USER_ID) n'a ni e-mail ni traduction sans être un fantôme.
//? Irréversible : restaurer la sauvegarde pour revenir en arrière.
export class Migration20260921220000_delete_unused_ghost_users extends Migration {
  override name = 'Migration20260921220000_delete_unused_ghost_users';

  override async up(): Promise<void> {
    const unused = (await this.execute(
      "select u.id, u.name, (select count(*) from `user_link` l where l.user_id = u.id) as links from `user` u join `role` r on r.id = u.role_id where u.zitadel_id is null and u.email is null and r.priority <= (select priority from `role` where name = 'translator') and not exists (select 1 from `game_translation_translator` t where t.user_id = u.id)",
    )) as { id: string; name: string; links: number | bigint }[];

    for (const ghost of unused) {
      if (Number(ghost.links) > 0) {
        console.warn(
          `[migration] « ${ghost.name} » n'a aucune traduction mais a des pages : conservé.`,
        );
        continue;
      }

      await this.execute('delete from `user` where id = ?', [ghost.id]);
    }
  }

  override async down(): Promise<void> {
    throw new Error(
      'Migration irréversible : restaurer la sauvegarde pour revenir en arrière.',
    );
  }
}
