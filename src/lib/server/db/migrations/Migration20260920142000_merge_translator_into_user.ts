import { randomUUID } from 'node:crypto';
import { Migration } from '@mikro-orm/migrations';
import {
  type MergeTranslator,
  type MergeUser,
  planTranslatorMerge,
} from '../translator-merge';

//? Supprime la table `translator` : les traductions et les liens passent à `user`. Un traducteur
//? sans compte devient un compte « fantôme » (sans zitadel_id ni e-mail), revendicable ensuite.
//? Le DDL de MariaDB valide implicitement la transaction : tout est exécuté séquentiellement et
//? les contrôles de cohérence ci-dessous font échouer la migration au plus tôt. Irréversible :
//? restaurer la sauvegarde pour revenir en arrière.
export class Migration20260920142000_merge_translator_into_user extends Migration {
  override name = 'Migration20260920142000_merge_translator_into_user';

  private async count(sql: string) {
    const [row] = await this.execute(sql);
    return Number(Object.values(row)[0]);
  }

  override async up(): Promise<void> {
    const translators = (await this.execute(
      'select id, name, user_id as userId, discord_id as discordId from translator',
    )) as MergeTranslator[];
    const users = (await this.execute(
      'select id, name, discord from user',
    )) as MergeUser[];
    const [translatorRole] = await this.execute(
      "select id from role where name = 'translator'",
    );
    if (!translatorRole) throw new Error('Rôle « translator » introuvable.');

    const plan = planTranslatorMerge(translators, users, randomUUID);
    const linksBefore = await this.count(
      'select count(*) from translator_link',
    );
    const relationsBefore = await this.count(
      'select count(*) from game_translation_translator',
    );

    await this.execute(
      'alter table `user` modify `email` varchar(128) null, modify `zitadel_id` char(36) null',
    );

    for (const item of plan) {
      if (item.action === 'created') {
        await this.execute(
          'insert into `user` (`id`, `name`, `discord`, `role_id`) values (?, ?, ?, ?)',
          [item.userId, item.name, item.discord, translatorRole.id],
        );
      } else {
        await this.execute(
          'update `user` set `name` = ?, `discord` = coalesce(?, `discord`) where `id` = ?',
          [item.name, item.discord, item.userId],
        );
      }
    }

    await this.execute(
      'create table `translator_user_map` (`translator_id` char(36) not null primary key, `user_id` char(36) not null)',
    );
    for (const item of plan) {
      await this.execute(
        'insert into `translator_user_map` (`translator_id`, `user_id`) values (?, ?)',
        [item.translatorId, item.userId],
      );
    }

    // game_translation_translator : translator_id -> user_id
    await this.execute(
      'alter table `game_translation_translator` add `user_id` char(36) null',
    );
    await this.execute(
      'update `game_translation_translator` t join `translator_user_map` m on m.translator_id = t.translator_id set t.user_id = m.user_id',
    );
    await this.execute(
      'delete a from `game_translation_translator` a join `game_translation_translator` b on a.game_translation_id = b.game_translation_id and a.user_id = b.user_id and a.translator_id > b.translator_id',
    );
    await this.execute(
      'alter table `game_translation_translator` modify `user_id` char(36) not null',
    );
    await this.execute(
      'alter table `game_translation_translator` drop foreign key `game_translation_translator_translator_fk`',
    );
    //? Un seul ALTER : la clé étrangère vers game_translation s'appuie sur la clé primaire, qui
    //? doit donc être remplacée dans la même opération plutôt que supprimée avant.
    await this.execute(
      'alter table `game_translation_translator` drop primary key, drop column `translator_id`, add primary key (`game_translation_id`, `user_id`), add index `game_translation_translator_user_id_index` (`user_id`)',
    );
    await this.execute(
      'alter table `game_translation_translator` add constraint `game_translation_translator_user_fk` foreign key (`user_id`) references `user` (`id`) on update restrict on delete cascade',
    );

    // translator_link -> user_link
    await this.execute(
      'create table `user_link` (`id` char(36) not null, `user_id` char(36) not null, `name` varchar(255) not null, `link` varchar(2048) not null, `order` tinyint unsigned not null, `created_at` datetime not null default current_timestamp(), `updated_at` datetime not null default current_timestamp() on update current_timestamp(), primary key (`id`)) default character set utf8mb4 engine = InnoDB',
    );
    await this.execute(
      'insert into `user_link` (`id`, `user_id`, `name`, `link`, `order`, `created_at`, `updated_at`) select l.id, m.user_id, l.name, l.link, l.`order`, l.created_at, l.updated_at from `translator_link` l join `translator_user_map` m on m.translator_id = l.translator_id',
    );
    await this.execute(
      'alter table `user_link` add index `user_link_user_id_index` (`user_id`)',
    );
    await this.execute(
      'alter table `user_link` add constraint `user_link_user_id_user_id_fkey` foreign key (`user_id`) references `user` (`id`) on update restrict on delete cascade',
    );

    // Contrôles avant de supprimer l'ancien modèle.
    const linksAfter = await this.count('select count(*) from user_link');
    if (linksAfter !== linksBefore) {
      throw new Error(`Liens perdus : ${linksBefore} -> ${linksAfter}.`);
    }
    const relationsAfter = await this.count(
      'select count(*) from game_translation_translator',
    );
    const [{ duplicates }] = await this.execute(
      'select count(*) as duplicates from (select 1 from `translator_user_map` group by `user_id` having count(*) > 1) d',
    );
    if (relationsAfter > relationsBefore || Number(duplicates) > 0) {
      throw new Error(
        `Incohérence : ${relationsBefore} -> ${relationsAfter} relations, ${duplicates} comptes ciblés plusieurs fois.`,
      );
    }

    await this.execute('drop table `translator_link`');
    await this.execute('drop table `translator`');
    await this.execute('drop table `translator_user_map`');
  }

  override down(): void {
    throw new Error(
      'Migration irréversible : restaurer la sauvegarde de la base pour revenir en arrière.',
    );
  }
}
