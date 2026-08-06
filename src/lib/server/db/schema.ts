import { type InferSelectModel, sql } from 'drizzle-orm';
import {
  boolean,
  char,
  datetime,
  foreignKey,
  mediumint,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  tinyint,
  tinytext,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createInsertSchema } from 'drizzle-orm/valibot';
import { pipe, url, uuid } from 'valibot';

export const originWebsite = mysqlTable('origin-website', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar('name', { length: 32 }).notNull(),
  link: varchar('link', { length: 2048 }).notNull(),
  image: varchar('image', { length: 2048 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const OriginWebsiteSchema = createInsertSchema(originWebsite, {
  id: (schema) => pipe(schema, uuid()),
  link: (schema) => pipe(schema, url()),
  image: (schema) => pipe(schema, url()),
});

export type OriginWebsite = InferSelectModel<typeof originWebsite>;

export const game = mysqlTable('game', {
  id: mediumint('id', { unsigned: true }).primaryKey().autoincrement(),
  name: tinytext('name').notNull(),
  link: varchar('link', { length: 2048 }).notNull(),
  origin: varchar('website', { length: 36 })
    .notNull()
    .references(() => originWebsite.id),
  threadId: mediumint('thread_id', { unsigned: true }),
  imageInternal: varchar('image_internal', { length: 2048 }), //? Lien CDN F95 France
  imageExternal: varchar('image_external', { length: 2048 }), //? Exemple: Lien F95 Attachments
  tags: text('tags').notNull(),
  description: text('description'),
  descriptionFr: text('description_fr'),
  autoCheck: boolean('auto_check').notNull(),
  active: boolean('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const GameSchema = createInsertSchema(game, {
  link: (schema) => pipe(schema, url()),
  imageInternal: (schema) => pipe(schema, url()),
  imageExternal: (schema) => pipe(schema, url()),
});

export type Game = InferSelectModel<typeof game>;

export const gameEdition = mysqlTable('game_edition', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: tinytext('name').notNull(),
  version: varchar('version', { length: 36 }).notNull(),
  status: mysqlEnum('status', [
    'in_progress',
    'completed',
    'abandoned',
    'on_hold',
  ]).notNull(),
  autoCheck: boolean('auto_check').notNull(),
  lastAutoCheck: datetime('last_auto_check'),
  active: boolean('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const GameEditionSchema = createInsertSchema(gameEdition, {
  id: (schema) => pipe(schema, uuid()),
});

export type GameEdition = InferSelectModel<typeof gameEdition>;

export const gameTranslation = mysqlTable('game_translation', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  version: varchar('version', { length: 36 }).notNull(),
  fileId: char('file_id', { length: 36 })
    .notNull()
    .references(() => gameTranslationFile.id),
  quality: mysqlEnum('quality', [
    'automatic',
    'partial-proofreading',
    'full-proofreading',
    'original-french',
    'unrated',
    'not-working',
  ]).notNull(),
  type: mysqlEnum('type', [
    'no_translation',
    'integrated',
    'translation',
    'translation_with_mods',
    'mods',
  ]),
  active: boolean('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const GameTranslationSchema = createInsertSchema(gameTranslation, {
  id: (schema) => pipe(schema, uuid()),
  fileId: (schema) => pipe(schema, uuid()),
});

export type GameTranslation = InferSelectModel<typeof gameTranslation>;

export const gameTranslationFile = mysqlTable('game_translation_file', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  version: varchar('version', { length: 36 }).notNull(),
  externalLink: varchar('external_link', { length: 2048 }).notNull(),
  internalLink: varchar('internal_link', { length: 2048 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const GameTranslationFileSchema = createInsertSchema(
  gameTranslationFile,
  {
    id: (schema) => pipe(schema, uuid()),
    externalLink: (schema) => pipe(schema, url()),
    internalLink: (schema) => pipe(schema, url()),
  },
);

export type GameTranslationFile = InferSelectModel<typeof gameTranslationFile>;

export const translator = mysqlTable('translator', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: tinytext('name').notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id),
  discordId: varchar('discord_id', { length: 36 }), // TODO: pas sur de la garder ici
  active: boolean('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const TranslatorSchema = createInsertSchema(translator, {
  id: (schema) => pipe(schema, uuid()),
});

export type Translator = InferSelectModel<typeof translator>;

export const gameTranslationTranslator = mysqlTable(
  'game_translation_translator',
  {
    gameTranslationId: char('game_translation_id', { length: 36 }).notNull(),

    translatorId: char('translator_id', { length: 36 }).notNull(),
    alert: boolean('alert').notNull().default(true),
    type: mysqlEnum('type', ['translator', 'proofreader']),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.gameTranslationId, table.translatorId],
    }),
    foreignKey({
      columns: [table.gameTranslationId],
      foreignColumns: [gameTranslation.id],
      name: 'game_translation_translator_translation_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.translatorId],
      foreignColumns: [translator.id],
      name: 'game_translation_translator_translator_fk',
    }).onDelete('cascade'),
  ],
);

export const GameTranslationTranslatorSchema = createInsertSchema(
  gameTranslationTranslator,
  {
    translatorId: (schema) => pipe(schema, uuid()),
    gameTranslationId: (schema) => pipe(schema, uuid()),
  },
);

export type GameTranslationTranslator = InferSelectModel<
  typeof gameTranslationTranslator
>;

export const translatorLink = mysqlTable('translator_link', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  translatorId: varchar('translator_id', { length: 36 })
    .notNull()
    .references(() => translator.id),
  name: tinytext('name').notNull(),
  link: varchar('link', { length: 2048 }).notNull(),
  order: tinyint('order', { unsigned: true }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const TranslatorLinkSchema = createInsertSchema(translatorLink, {
  id: (schema) => pipe(schema, uuid()),
  link: (schema) => pipe(schema, url()),
});

export type TranslatorLink = InferSelectModel<typeof translatorLink>;

export const user = mysqlTable('user', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  zitadelId: varchar('zitadel_id', { length: 36 }).notNull().unique(), //! Zitadel's `sub` claim, set on first login
  discordNotification: boolean('discord_notification').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const UserSchema = createInsertSchema(user, {
  id: (schema) => pipe(schema, uuid()),
});

export type User = InferSelectModel<typeof user>;

export const config = mysqlTable('config', {
  id: tinyint('id').primaryKey().default(1), //! Unique ID for the config
  name: tinytext('name').notNull(),
  maintenanceMode: boolean('maintenance_mode').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const ConfigSchema = createInsertSchema(config);

export type Config = InferSelectModel<typeof config>;

export const role = mysqlTable('role', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: tinytext('name').notNull(),
  label: tinytext('label').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const RoleSchema = createInsertSchema(role);

export type Role = InferSelectModel<typeof config>;
