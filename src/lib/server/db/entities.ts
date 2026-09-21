import { randomUUID } from 'node:crypto';
import { defineEntity, p } from '@mikro-orm/mariadb';

const uuidPk = () =>
  p
    .uuid()
    .primary()
    .columnType('char(36)')
    .onCreate(() => randomUUID());

const uuidFk = () => p.uuid().columnType('char(36)');

const timestamps = () => ({
  createdAt: p.datetime().defaultRaw('current_timestamp()'),
  updatedAt: p
    .datetime()
    .defaultRaw('current_timestamp()')
    .extra('on update current_timestamp()'),
});

export const OriginWebsiteSchema = defineEntity({
  name: 'OriginWebsite',
  tableName: 'origin-website',
  properties: {
    id: uuidPk(),
    name: p.string().length(32),
    link: p.string().length(2048),
    image: p.string().length(2048),
    ...timestamps(),
  },
});

export class OriginWebsite extends OriginWebsiteSchema.class {}
OriginWebsiteSchema.setClass(OriginWebsite);

export const GameSchema = defineEntity({
  name: 'Game',
  tableName: 'game',
  properties: {
    id: p.mediumint().unsigned().primary().autoincrement(),
    name: p.string().length(255),
    link: p.string().length(2048),
    origin: () =>
      p
        .manyToOne(OriginWebsite)
        .fieldName('website')
        .columnType('char(36)')
        .foreignKeyName('game_website_origin-website_id_fkey'),
    threadId: p.mediumint().unsigned().nullable(),
    //? Timestamp (unix, secondes) du dernier changement connu par l'API de F95Checker : le scraper
    //? ne redemande les données complètes que s'il augmente. Nul tant que le jeu n'a jamais été synchronisé.
    lastChange: p.integer().unsigned().nullable(),
    developer: p.string().length(255).nullable(),
    lastUpdated: p.datetime().nullable(),
    score: p.decimal().precision(3).scale(2).nullable(),
    votes: p.integer().unsigned().nullable(),
    downloads: p.json<unknown[]>().nullable(),
    reviews: p.json<unknown[]>().nullable(),
    //? Version filtrée des tags du jeu : identifiants F95Checker (`game_tags.f95_id`, triés, sans doublon) de
    //? ses tags F95zone et de ceux vers lesquels pointent ses autres tags (`game_tags.f95_tag_id`).
    //? Recalculée par `syncGameTagsF95` ; nulle tant que le jeu n'a jamais été calculé.
    tagsF95: p.json<number[]>().nullable(),
    imageInternal: p.string().length(2048).nullable(),
    imageExternal: p.string().length(2048).nullable(),
    description: p.text().nullable(),
    descriptionFr: p.text().nullable(),
    autoCheck: p.boolean(),
    active: p.boolean(),
    gameEditions: () => p.oneToMany(GameEdition).mappedBy('game'),
    gameGameTags: () => p.oneToMany(GameGameTags).mappedBy('game'),
    ...timestamps(),
  },
});

export class Game extends GameSchema.class {}
GameSchema.setClass(Game);

export const GameTagsSchema = defineEntity({
  name: 'GameTags',
  tableName: 'game_tags',
  properties: {
    id: p.mediumint().unsigned().primary().autoincrement(),
    name: p.string().length(255),
    //? Identifiant du tag chez F95Checker (celui que renvoie le scraper dans `thread.tags`) : nul pour
    //? un tag qui n'existe pas côté F95, notamment ceux repris de la v4.
    f95Id: p.smallint().unsigned().fieldName('f95_id').unique().nullable(),
    //? Faux pour un tag que ni F95Checker ni le dictionnaire `F95_TAG_ID_BY_NAME` ne connaissent : il reste
    //? sur ses jeux mais attend d'être classé (gardé ou écarté).
    active: p.boolean().default(true),
    //? Tag F95zone auquel ce tag est lié (jamais fusionné : il garde ses jeux). Sert à remplir `game.tags_f95`.
    //? Nul pour un tag F95zone (il se représente lui-même) et pour un tag sans équivalent chez F95zone.
    f95Tag: () =>
      p
        .manyToOne(GameTags)
        .fieldName('f95_tag_id')
        .foreignKeyName('game_tags_f95_tag_fk')
        .deleteRule('set null')
        .updateRule('restrict')
        .nullable(),
    ...timestamps(),
  },
});

export class GameTags extends GameTagsSchema.class {}
GameTagsSchema.setClass(GameTags);

export const GameGameTagsSchema = defineEntity({
  name: 'GameGameTags',
  tableName: 'game_game_tags',
  properties: {
    game: () =>
      p
        .manyToOne(Game)
        .primary()
        .fieldName('game_id')
        .foreignKeyName('game_game_tags_game_fk')
        .deleteRule('cascade')
        .updateRule('restrict'),
    gameTag: () =>
      p
        .manyToOne(GameTags)
        .primary()
        .fieldName('game_tag_id')
        .foreignKeyName('game_game_tags_game_tag_fk')
        .deleteRule('cascade')
        .updateRule('restrict'),
    ...timestamps(),
  },
});

export class GameGameTags extends GameGameTagsSchema.class {}
GameGameTagsSchema.setClass(GameGameTags);

export const GameEditionSchema = defineEntity({
  name: 'GameEdition',
  tableName: 'game_edition',
  properties: {
    id: uuidPk(),
    game: () =>
      p
        .manyToOne(Game)
        .fieldName('game_id')
        .foreignKeyName('game_edition_game_id_game_id_fkey'),
    name: p.string().length(255).nullable(),
    version: p.string().length(36),
    status: p.enum([
      'in_progress',
      'completed',
      'abandoned',
      'on_hold',
    ] as const),
    autoCheck: p.boolean(),
    lastAutoCheck: p.datetime().nullable(),
    active: p.boolean(),
    gameTranslations: () =>
      p.oneToMany(GameTranslation).mappedBy('gameEdition'),
    ...timestamps(),
  },
});

export class GameEdition extends GameEditionSchema.class {}
GameEditionSchema.setClass(GameEdition);

export const GameTranslationSchema = defineEntity({
  name: 'GameTranslation',
  tableName: 'game_translation',
  properties: {
    id: uuidPk(),
    gameEdition: () =>
      p
        .manyToOne(GameEdition)
        .fieldName('game_edition_id')
        .columnType('char(36)')
        .foreignKeyName(
          'game_translation_game_edition_id_game_edition_id_fkey',
        ),
    version: p.string().length(36),
    quality: p.enum([
      'automatic',
      'partial-proofreading',
      'full-proofreading',
      'original-french',
      'unrated',
      'not-working',
    ] as const),
    type: p.enum([
      'no_translation',
      'integrated',
      'translation',
      'translation_with_mods',
      'mods',
    ] as const),
    active: p.boolean(),
    gameTranslationFiles: () =>
      p.oneToMany(GameTranslationFile).mappedBy('gameTranslation'),
    gameTranslationTranslators: () =>
      p.oneToMany(GameTranslationTranslator).mappedBy('gameTranslation'),
    ...timestamps(),
  },
});

export class GameTranslation extends GameTranslationSchema.class {}
GameTranslationSchema.setClass(GameTranslation);

export const GameTranslationFileSchema = defineEntity({
  name: 'GameTranslationFile',
  tableName: 'game_translation_file',
  properties: {
    id: uuidPk(),
    gameTranslation: () =>
      p
        .manyToOne(GameTranslation)
        .fieldName('game_translation_id')
        .columnType('char(36)')
        .foreignKeyName('game_translation_file_q2YzPs4xJIF9_fkey'),
    version: p.string().length(36),
    active: p.boolean().default(true),
    externalLink: p.string().length(2048).nullable(),
    internalLink: p.string().length(2048).nullable(),
    ...timestamps(),
  },
});

export class GameTranslationFile extends GameTranslationFileSchema.class {}
GameTranslationFileSchema.setClass(GameTranslationFile);

export const GameTranslationTranslatorSchema = defineEntity({
  name: 'GameTranslationTranslator',
  tableName: 'game_translation_translator',
  properties: {
    gameTranslation: () =>
      p
        .manyToOne(GameTranslation)
        .primary()
        .fieldName('game_translation_id')
        .columnType('char(36)')
        .foreignKeyName('game_translation_translator_translation_fk')
        .deleteRule('cascade')
        .updateRule('restrict'),
    //? Le traducteur ou relecteur : un compte utilisateur (éventuellement fantôme, sans zitadelId).
    user: () =>
      p
        .manyToOne(User)
        .primary()
        .fieldName('user_id')
        .columnType('char(36)')
        .foreignKeyName('game_translation_translator_user_fk')
        .deleteRule('cascade')
        .updateRule('restrict'),
    alert: p.boolean().default(true),
    //? Crédité anonymement : la personne reste liée à la traduction, mais son nom n'est pas affiché au public.
    anonymous: p.boolean().default(false),
    type: p.enum(['translator', 'proofreader'] as const).nullable(),
    ...timestamps(),
  },
});

export class GameTranslationTranslator extends GameTranslationTranslatorSchema.class {}
GameTranslationTranslatorSchema.setClass(GameTranslationTranslator);

export const UserLinkSchema = defineEntity({
  name: 'UserLink',
  tableName: 'user_link',
  properties: {
    id: uuidPk(),
    user: () =>
      p
        .manyToOne(User)
        .fieldName('user_id')
        .columnType('char(36)')
        .foreignKeyName('user_link_user_id_user_id_fkey')
        .deleteRule('cascade')
        .updateRule('restrict'),
    name: p.string().length(255),
    link: p.string().length(2048),
    order: p.tinyint().unsigned(),
    ...timestamps(),
  },
});

export class UserLink extends UserLinkSchema.class {}
UserLinkSchema.setClass(UserLink);

export const RoleSchema = defineEntity({
  name: 'Role',
  tableName: 'role',
  properties: {
    id: uuidPk(),
    name: p.string().length(64).unique(),
    label: p.string().length(64),
    description: p.text().nullable(),
    //? Plus la valeur est haute, plus le rôle est fort : il sert à l'ordre d'affichage et à la
    //? hiérarchie (on ne gère que les rôles plus faibles que le sien).
    priority: p.integer().unsigned().default(0),
    //? Les rôles système ne se renomment ni ne se suppriment (migrate-v4 et le seed s'en servent).
    isSystem: p.boolean().default(false),
    //? Quotas API appliqués aux utilisateurs de ce rôle.
    apiKeyLimit: p.integer().unsigned().default(10),
    apiDailyQuota: p.integer().unsigned().default(1000),
    ...timestamps(),
  },
});

export class Role extends RoleSchema.class {}
RoleSchema.setClass(Role);

export const RolePermissionSchema = defineEntity({
  name: 'RolePermission',
  tableName: 'role_permission',
  properties: {
    role: () =>
      p
        .manyToOne(Role)
        .primary()
        .fieldName('role_id')
        .columnType('char(36)')
        .foreignKeyName('role_permission_role_id_role_id_fkey')
        .deleteRule('cascade')
        .updateRule('restrict'),
    //? Clé du catalogue `$lib/permissions`.
    permission: p.string().length(64).primary(),
    ...timestamps(),
  },
});

export class RolePermission extends RolePermissionSchema.class {}
RolePermissionSchema.setClass(RolePermission);

export const UserSchema = defineEntity({
  name: 'User',
  tableName: 'user',
  properties: {
    id: uuidPk(),
    name: p.string().length(64),
    //? Adresse de son profil (/profile/<slug>), fabriquée depuis le nom (voir `$lib/slug`) et unique.
    slug: p.string().length(64).unique(),
    //? Un compte fantôme (traducteur sans compte, revendicable) n'a ni e-mail ni zitadelId.
    email: p.string().length(128).nullable(),
    description: p.text().nullable(),
    avatar: p.string().length(2048).nullable(),
    banner: p.string().length(2048).nullable(),
    discord: p.string().length(32).nullable(),
    theme: p.enum(['system', 'light', 'dark'] as const).default('system'),
    role: () =>
      p
        .manyToOne(Role)
        .fieldName('role_id')
        .columnType('char(36)')
        .foreignKeyName('user_role_id_role_id_fkey'),
    zitadelId: uuidFk().unique().nullable(),
    discordNotification: p.boolean().default(true),
    ...timestamps(),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);

export const ApiKeySchema = defineEntity({
  name: 'ApiKey',
  tableName: 'api_key',
  properties: {
    id: uuidPk(),
    user: () =>
      p
        .manyToOne(User)
        .fieldName('user_id')
        .columnType('char(36)')
        .foreignKeyName('api_key_user_id_user_id_fkey')
        .deleteRule('cascade')
        .updateRule('restrict'),
    name: p.string().length(64),
    //? Seuls le préfixe (affichage) et le hash SHA-256 sont stockés, jamais la clé en clair.
    prefix: p.string().length(16),
    hash: p.string().length(64).unique(),
    //? Surcharge du quota quotidien du rôle ; null = celui du rôle.
    dailyQuota: p.integer().unsigned().nullable(),
    //? Requêtes comptées pour le jour UTC `usageDate` (remis à zéro au changement de jour).
    usageCount: p.integer().unsigned().default(0),
    usageDate: p.date().nullable(),
    lastUsedAt: p.datetime().nullable(),
    ...timestamps(),
  },
});

export class ApiKey extends ApiKeySchema.class {}
ApiKeySchema.setClass(ApiKey);

//? Un utilisateur qui a pris la place d'un autre (au plus une à la fois). Côté serveur, donc
//? infalsifiable ; elle expire d'elle-même (voir IMPERSONATION_TTL_MS).
export const ImpersonationSchema = defineEntity({
  name: 'Impersonation',
  tableName: 'impersonation',
  properties: {
    //? Le vrai compte, celui qui a lancé la prise de place.
    user: () =>
      p
        .manyToOne(User)
        .primary()
        .fieldName('user_id')
        .columnType('char(36)')
        .foreignKeyName('impersonation_user_id_user_id_fkey')
        .deleteRule('cascade')
        .updateRule('restrict'),
    target: () =>
      p
        .manyToOne(User)
        .fieldName('target_id')
        .columnType('char(36)')
        .foreignKeyName('impersonation_target_id_user_id_fkey')
        .deleteRule('cascade')
        .updateRule('restrict'),
    ...timestamps(),
  },
});

export class Impersonation extends ImpersonationSchema.class {}
ImpersonationSchema.setClass(Impersonation);

export const ConfigSchema = defineEntity({
  name: 'Config',
  tableName: 'config',
  properties: {
    id: p.tinyint().primary().default(1),
    name: p.string().length(255),
    maintenanceMode: p.boolean().default(false),
    ...timestamps(),
  },
});

export class Config extends ConfigSchema.class {}
ConfigSchema.setClass(Config);
