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
  tinyint,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createInsertSchema } from 'drizzle-valibot';
import { pipe, url } from 'valibot';

export const originWebsite = mysqlTable('origin-website', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar('website', { length: 32 }).notNull(),
  link: varchar('link', { length: 2048 }).notNull(),
  image: varchar('image', { length: 2048 }).notNull(),
  createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
});

export const OriginWebsiteSchema = createInsertSchema(originWebsite, {
  link: (schema) => pipe(schema, url()),
  image: (schema) => pipe(schema, url()),
});

export type OriginWebsite = InferSelectModel<typeof originWebsite>;

export const game = mysqlTable('game', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar('name', { length: 255 }).notNull(),
  link: varchar('link', { length: 2048 }).notNull(),
  origin: varchar('website', { length: 36 })
    .notNull()
    .references(() => originWebsite.id),
  threadId: mediumint('thread_id', { unsigned: true }),
  version: varchar('version', { length: 32 }).notNull(),
  imageInternal: varchar('image', { length: 2048 }), // Lien CDN F95 France
  imageExternal: varchar('image', { length: 2048 }), // Exemple: Lien F95 Attachments
  tags: text('tags').notNull(),
  description: text('description'),
  descriptionFr: text('description_fr'),
  autoCheck: boolean('auto_check').notNull(),
  active: boolean('active').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
});

export const GameSchema = createInsertSchema(game, {
  link: (schema) => pipe(schema, url()),
  imageInternal: (schema) => pipe(schema, url()),
  imageExternal: (schema) => pipe(schema, url()),
});

export type Game = InferSelectModel<typeof game>;

export const gameEdition = mysqlTable('game_edition', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar('name', { length: 255 }).notNull(),
  version: varchar('version', { length: 32 }).notNull(),
  status: mysqlEnum('status', [
    'in_progress',
    'completed',
    'abandoned',
    'on_hold',
  ]).notNull(),
  autoCheck: boolean('auto_check').notNull(),
  lastAutoCheck: datetime('last_auto_check'),
  active: boolean('active').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
});

export const GameEditionSchema = createInsertSchema(gameEdition);

export type GameEdition = InferSelectModel<typeof gameEdition>;

export const gameTranslation = mysqlTable('game_translation', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  version: varchar('version', { length: 32 }).notNull(),
  link: varchar('link', { length: 2048 }).notNull(),
  file: char('file', { length: 36 }).primaryKey(),
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
  createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
});

export const GameTranslationSchema = createInsertSchema(gameTranslation, {
  link: (schema) => pipe(schema, url()),
});

export type GameTranslation = InferSelectModel<typeof gameTranslation>;

export const gameTranslationTranslator = mysqlTable(
  'game_translation_translator',
  {
    gameTranslationId: char('game_translation_id', { length: 36 }).notNull(),

    translatorId: char('translator_id', { length: 36 }).notNull(),
    alert: boolean().notNull().default(true),
    type: mysqlEnum(['translator', 'proofreader']),
    createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
    updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
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
);

export type GameTranslationTranslator = InferSelectModel<
  typeof gameTranslationTranslator
>;

export const translator = mysqlTable('translator', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar('name', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id),
  discordId: varchar('discord_id', { length: 36 }), // TODO: pas sur de la garder ici
  active: boolean('active').notNull(),
  createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
});

export const TranslatorSchema = createInsertSchema(translator);

export type Translator = InferSelectModel<typeof translator>;

export const translatorLink = mysqlTable('translator_link', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  translatorId: varchar('translator_id', { length: 36 })
    .notNull()
    .references(() => translator.id),
  name: varchar('name', { length: 255 }).notNull(),
  link: varchar('link', { length: 2048 }).notNull(),
  order: tinyint('order', { unsigned: true }).notNull(),
  createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
});

export const TranslatorLinkSchema = createInsertSchema(translatorLink, {
  link: (schema) => pipe(schema, url()),
});

export type TranslatorLink = InferSelectModel<typeof translatorLink>;

export const user = mysqlTable('user', {
  //? Géré par Zitadel
  //TODO: faire la table user
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  discordNotification: boolean().notNull().default(true),
  createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
});

export const UserSchema = createInsertSchema(user);

export type User = InferSelectModel<typeof user>;

export const config = mysqlTable('config', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  appName: varchar('app_name', { length: 255 }).notNull().default('F95 France'),
  maintenanceMode: boolean('maintenance_mode').notNull().default(false),
  createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
});

export const ConfigSchema = createInsertSchema(config);

export type Config = InferSelectModel<typeof config>;

export const role = mysqlTable('role', {
  id: char('id', { length: 36 }).primaryKey().default(sql`(UUID())`),
  appName: varchar('app_name', { length: 255 }).notNull().default('F95 France'),
  maintenanceMode: boolean('maintenance_mode').notNull().default(false),
  createdAt: datetime('created_at').notNull().default(sql`(NOW())`),
  updatedAt: datetime('updated_at').notNull().default(sql`(NOW())`),
});

export const RoleSchema = createInsertSchema(role);

export type Role = InferSelectModel<typeof config>;
