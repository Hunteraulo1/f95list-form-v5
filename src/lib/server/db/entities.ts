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
    type: p
      .enum([
        'no_translation',
        'integrated',
        'translation',
        'translation_with_mods',
        'mods',
      ] as const)
      .nullable(),
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
    externalLink: p.string().length(2048).nullable(),
    internalLink: p.string().length(2048).nullable(),
    ...timestamps(),
  },
});

export class GameTranslationFile extends GameTranslationFileSchema.class {}
GameTranslationFileSchema.setClass(GameTranslationFile);

export const TranslatorSchema = defineEntity({
  name: 'Translator',
  tableName: 'translator',
  properties: {
    id: uuidPk(),
    name: p.string().length(255),
    user: () =>
      p
        .manyToOne(User)
        .fieldName('user_id')
        .columnType('char(36)')
        .foreignKeyName('translator_user_id_user_id_fkey')
        .nullable()
        .deleteRule('restrict'),
    discordId: p.string().length(36).nullable(),
    active: p.boolean(),
    translatorLinks: () => p.oneToMany(TranslatorLink).mappedBy('translator'),
    gameTranslationTranslators: () =>
      p.oneToMany(GameTranslationTranslator).mappedBy('translator'),
    ...timestamps(),
  },
});

export class Translator extends TranslatorSchema.class {}
TranslatorSchema.setClass(Translator);

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
    translator: () =>
      p
        .manyToOne(Translator)
        .primary()
        .fieldName('translator_id')
        .columnType('char(36)')
        .foreignKeyName('game_translation_translator_translator_fk')
        .deleteRule('cascade')
        .updateRule('restrict'),
    alert: p.boolean().default(true),
    type: p.enum(['translator', 'proofreader'] as const).nullable(),
    ...timestamps(),
  },
});

export class GameTranslationTranslator extends GameTranslationTranslatorSchema.class {}
GameTranslationTranslatorSchema.setClass(GameTranslationTranslator);

export const TranslatorLinkSchema = defineEntity({
  name: 'TranslatorLink',
  tableName: 'translator_link',
  properties: {
    id: uuidPk(),
    translator: () =>
      p
        .manyToOne(Translator)
        .fieldName('translator_id')
        .columnType('char(36)')
        .foreignKeyName('translator_link_translator_id_translator_id_fkey'),
    name: p.string().length(255),
    link: p.string().length(2048),
    order: p.tinyint().unsigned(),
    ...timestamps(),
  },
});

export class TranslatorLink extends TranslatorLinkSchema.class {}
TranslatorLinkSchema.setClass(TranslatorLink);

export const RoleSchema = defineEntity({
  name: 'Role',
  tableName: 'role',
  properties: {
    id: uuidPk(),
    name: p.string().length(64),
    label: p.string().length(64),
    ...timestamps(),
  },
});

export class Role extends RoleSchema.class {}
RoleSchema.setClass(Role);

export const UserSchema = defineEntity({
  name: 'User',
  tableName: 'user',
  properties: {
    id: uuidPk(),
    role: () =>
      p
        .manyToOne(Role)
        .fieldName('role_id')
        .columnType('char(36)')
        .foreignKeyName('user_role_id_role_id_fkey'),
    zitadelId: uuidFk().unique(),
    discordNotification: p.boolean().default(true),
    ...timestamps(),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);

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
