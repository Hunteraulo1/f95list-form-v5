import { randomInt } from 'node:crypto';
import { detectExtensionBrowserTarget } from '#lib/extension-browser.ts';
import { SUPER_ROLE } from '#lib/permissions.ts';
import { VIEW_ACTIVE_ONLY } from '#lib/server/config.ts';
import { GameTranslation, orm } from '#lib/server/db/index.ts';
import { getExtensionDownloadUrls } from '#lib/server/extension-downloads.ts';
import { isTranslationOutdated } from '#lib/server/my-translations.ts';

interface LatestTranslationRow {
  id: string;
  name: string;
  editionName: string | null;
  image: string | null;
}

const countTranslators = async () => {
  const [row] = await orm.em.getConnection().execute<{ count: number }[]>(
    VIEW_ACTIVE_ONLY
      ? `select count(distinct gtt.user_id) as count
         from game_translation_translator gtt
         join game_translation gt on gt.id = gtt.game_translation_id
         where gt.active = 1`
      : 'select count(distinct user_id) as count from game_translation_translator',
  );

  return Number(row.count);
};

interface ExtensionGameRow {
  id: number;
  name: string;
  image: string;
  type: string;
  version: string;
  editionVersion: string;
}

//? Quelques jeux F95zone traduits, tirés au hasard, pour la maquette de l'extension : c'est sur ce
//? site qu'elle s'affiche, avec la version de la traduction et si elle est à jour.
const listExtensionMockupGames = async (limit: number) => {
  const rows = await orm.em.getConnection().execute<ExtensionGameRow[]>(
    `select g.id, g.name, coalesce(g.image_internal, g.image_external) as image,
            t.type, t.version, e.version as editionVersion
     from game_translation t
     join game_edition e on e.id = t.game_edition_id
     join game g on g.id = e.game_id
     join \`origin-website\` o on o.id = g.website
     where o.name = 'F95zone' and t.type <> 'no_translation'
       and coalesce(g.image_internal, g.image_external) is not null
       ${VIEW_ACTIVE_ONLY ? 'and t.active = 1 and e.active = 1 and g.active = 1' : ''}
     order by rand()
     limit ${limit * 4}`,
  );

  //? Un jeu peut sortir plusieurs fois (une ligne par traduction) : une seule est gardée.
  const byGame = new Map(rows.map((row) => [row.id, row]));

  return [...byGame.values()].slice(0, limit).map((row) => ({
    id: String(row.id),
    name: row.name,
    image: row.image,
    tversion:
      row.type === 'integrated' ? 'Intégrée' : row.version.trim() || 'n/a',
    upToDate: !isTranslationOutdated({
      type: row.type,
      version: row.version,
      editionVersion: row.editionVersion,
      followed: true,
    }),
  }));
};

interface StaffRow {
  name: string;
  slug: string;
  avatar: string | null;
  roleLabel: string;
  roleStyle: string;
}

//? L'équipe : les comptes réels dont le rôle donne accès à l'administration (et le super admin, qui
//? a tous les droits sans qu'ils soient listés). Du rôle le plus fort au plus faible.
const listStaff = () =>
  orm.em.getConnection().execute<StaffRow[]>(
    `select u.name, u.slug, u.avatar, r.label as roleLabel, r.badge_style as roleStyle
     from user u
     join role r on r.id = u.role_id
     where u.zitadel_id is not null
       and (r.name = ? or exists (
         select 1 from role_permission rp
         where rp.role_id = r.id and rp.permission = 'admin.access'
       ))
     order by r.priority desc, u.name asc`,
    [SUPER_ROLE],
  );

export const load = async ({ request }: { request: Request }) => {
  const random = randomInt(1000000);

  const rows = await orm.em
    .createQueryBuilder(GameTranslation, 'gt')
    .join('gt.gameEdition', 'ge')
    .join('ge.game', 'g')
    .select([
      'g.id as id',
      'g.name as name',
      'ge.name as editionName',
      'g.imageExternal as image',
    ])
    .where(
      VIEW_ACTIVE_ONLY
        ? { 'gt.active': true, 'ge.active': true, 'g.active': true }
        : {},
    )
    .orderBy({ 'gt.updatedAt': 'desc' })
    .limit(5)
    .execute<LatestTranslationRow[]>();

  const games = rows.map(({ id, image, name, editionName }) => {
    return {
      id,
      image,
      name: editionName ? `${editionName} - ${name}` : name,
    };
  });
  return {
    games,
    extensionGames: await listExtensionMockupGames(5),
    staff: await listStaff(),
    extensionDownloads: await getExtensionDownloadUrls(),
    //? D'après l'en-tête du navigateur ; la page le redétecte une fois affichée.
    extensionBrowser: detectExtensionBrowserTarget(
      request.headers.get('user-agent'),
    ),
    stats: [
      {
        title: 'traducteur',
        //? Les comptes qui figurent comme traducteur ou relecteur d'au moins une traduction.
        value: await countTranslators(),
      },
      {
        title: 'traductions',
        value: await orm.em.count(
          GameTranslation,
          VIEW_ACTIVE_ONLY ? { active: true } : {},
        ),
      },
      {
        title: 'téléchargements',
        value: random,
      },
      {
        title: 'visites',
        value: random + randomInt(10000000),
      },
    ],
  };
};
