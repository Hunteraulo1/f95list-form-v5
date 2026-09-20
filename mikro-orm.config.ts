import { defineConfig } from '@mikro-orm/mariadb';
import { Migrator } from '@mikro-orm/migrations';
import { config } from 'dotenv';
import {
  ApiKey,
  Config,
  Game,
  GameEdition,
  GameGameTags,
  GameTags,
  GameTranslation,
  GameTranslationFile,
  GameTranslationTranslator,
  Impersonation,
  OriginWebsite,
  Role,
  RolePermission,
  User,
  UserLink,
} from './src/lib/server/db/entities';

config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: [
    ApiKey,
    Config,
    Game,
    GameEdition,
    GameGameTags,
    GameTags,
    GameTranslation,
    GameTranslationFile,
    GameTranslationTranslator,
    Impersonation,
    OriginWebsite,
    Role,
    RolePermission,
    User,
    UserLink,
  ],
  extensions: [Migrator],
  migrations: { path: './src/lib/server/db/migrations' },
});
