import { faker } from '@faker-js/faker';
import { config } from 'dotenv';
import { defineRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { reset, seed } from 'drizzle-seed';
import * as schema from './schema';
import {
  game,
  gameEdition,
  gameTranslation,
  gameTranslationTranslator,
  originWebsite,
  translator,
  translatorLink,
  user,
} from './schema';

config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const relations = defineRelations(schema);

const db = drizzle(process.env.DATABASE_URL, { relations });

export const main = async () => {
  await reset(db, schema);

  await seed(db, {
    originWebsite,
    game,
    gameEdition,
    gameTranslation,
    gameTranslationTranslator,
    translator,
    translatorLink,
    user,
  }).refine((funcs) => ({
    game: {
      columns: {
        imageExternal: funcs.valuesFromArray({
          values: Array.from({ length: 50 }, () =>
            faker.image.personPortrait(),
          ),
        }),
      },
    },
    translatorLink: {
      columns: {
        order: funcs.int({ minValue: 0, maxValue: 255 }),
      },
    },
    gameTranslation: {
      columns: {
        type: funcs.valuesFromArray({
          values: [
            'no_translation',
            'integrated',
            'translation',
            'translation_with_mods',
            'mods',
          ],
        }),
      },
    },
    gameTranslationTranslator: {
      columns: {
        type: funcs.valuesFromArray({
          values: ['translator', 'proofreader'],
        }),
      },
    },
  }));
};

if (import.meta.main) {
  await main();
  process.exit(0);
}
