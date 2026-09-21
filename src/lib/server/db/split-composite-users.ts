import { randomUUID } from 'node:crypto';
import { SlugAllocator } from '../../slug';
import { splitTranslatorNames } from './translator-merge';

//? `execute` de la migration qui l'appelle (requête SQL avec paramètres, lignes en retour).
type Execute = (
  sql: string,
  params?: unknown[],
) => Promise<Record<string, unknown>[]>;

//? Corrige les comptes fantômes hérités de la v4 qui désignent plusieurs personnes (« A et B », « A, B »,
//? « A + B », « A (Avec la participation de B) ») : chaque personne rejoint le compte de même nom (s'il est
//? unique), ou en reçoit un nouveau (fantôme, rôle traducteur), reçoit les traductions du compte composite,
//? puis celui-ci est supprimé. Un composite lié à un Discord ou à des pages, ou dont un nom correspond à
//? plusieurs comptes, n'est pas touché : on ne sait pas à qui les attribuer. Partagé par les migrations qui rejouent la correction quand la règle de
//? découpage s'étend.
export const splitCompositeGhostUsers = async (execute: Execute) => {
  const [translatorRole] = await execute(
    "select id from role where name = 'translator'",
  );
  if (!translatorRole) throw new Error('Rôle « translator » introuvable.');

  const slugRows = (await execute('select slug from `user`')) as {
    slug: string;
  }[];
  const slugs = new SlugAllocator(slugRows.map(({ slug }) => slug));

  const ghosts = (await execute(
    'select id, name, discord from `user` where zitadel_id is null and email is null',
  )) as { id: string; name: string; discord: string | null }[];

  for (const ghost of ghosts) {
    const names = splitTranslatorNames(ghost.name);
    if (names.length < 2) continue;

    const [{ links }] = await execute(
      'select count(*) as links from `user_link` where user_id = ?',
      [ghost.id],
    );
    if (ghost.discord || Number(links) > 0) {
      console.warn(
        `[migration] « ${ghost.name} » désigne plusieurs personnes mais a un Discord ou des pages : non découpé, à traiter à la main.`,
      );
      continue;
    }

    //? Un nom qui correspond à plusieurs comptes ne se devine pas : on ne découpe rien avant d'avoir levé
    //? l'ambiguïté à la main, pour ne pas attribuer les traductions à un homonyme.
    const matches = await Promise.all(
      names.map((name) =>
        execute(
          'select id, zitadel_id from `user` where lower(name) = lower(?) and id <> ?',
          [name, ghost.id],
        ),
      ),
    );
    const ambiguous = names.filter((_, index) => matches[index].length > 1);
    if (ambiguous.length > 0) {
      console.warn(
        `[migration] « ${ghost.name} » : plusieurs comptes portent le nom de ${ambiguous.map((name) => `« ${name} »`).join(', ')} : non découpé, à traiter à la main.`,
      );
      continue;
    }

    for (const [index, name] of names.entries()) {
      const [existing] = matches[index];

      let personId = existing ? String(existing.id) : null;
      if (existing) {
        console.info(
          `[migration] « ${ghost.name} » : « ${name} » rejoint le compte existant ${personId}${existing.zitadel_id ? ' (compte réel)' : ''}.`,
        );
      } else {
        personId = randomUUID();
        await execute(
          'insert into `user` (`id`, `name`, `slug`, `role_id`) values (?, ?, ?, ?)',
          [personId, name, slugs.allocate(name), translatorRole.id],
        );
      }

      //? Clé primaire (traduction, compte) : si la personne est déjà sur cette traduction, rien à ajouter.
      await execute(
        'insert ignore into `game_translation_translator` (`game_translation_id`, `user_id`, `alert`, `type`, `anonymous`) select `game_translation_id`, ?, `alert`, `type`, `anonymous` from `game_translation_translator` where `user_id` = ?',
        [personId, ghost.id],
      );
    }

    //? Les lignes de liaison partent avec le compte (suppression en cascade).
    await execute('delete from `user` where id = ?', [ghost.id]);
  }
};
