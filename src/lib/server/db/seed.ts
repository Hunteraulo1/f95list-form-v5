import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { MikroORM } from '@mikro-orm/mariadb';
import { config as loadEnv } from 'dotenv';
import mikroOrmConfig from '../../../../mikro-orm.config';
import {
  Config,
  Game,
  GameEdition,
  GameTranslation,
  GameTranslationFile,
  GameTranslationTranslator,
  OriginWebsite,
  Role,
  Translator,
  TranslatorLink,
  User,
} from './entities';

loadEnv();

const GAME_EDITION_STATUSES = [
  'in_progress',
  'completed',
  'abandoned',
  'on_hold',
] as const;

const GAME_TRANSLATION_QUALITIES = [
  'automatic',
  'partial-proofreading',
  'full-proofreading',
  'original-french',
  'unrated',
  'not-working',
] as const;

const GAME_TRANSLATION_TYPES = [
  'no_translation',
  'integrated',
  'translation',
  'translation_with_mods',
  'mods',
] as const;

export const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  const em = orm.em.fork();

  await em.nativeDelete(GameTranslationTranslator, {});
  await em.nativeDelete(TranslatorLink, {});
  await em.nativeDelete(Translator, {});
  await em.nativeDelete(GameTranslationFile, {});
  await em.nativeDelete(GameTranslation, {});
  await em.nativeDelete(GameEdition, {});
  await em.nativeDelete(Game, {});
  await em.nativeDelete(OriginWebsite, {});
  await em.nativeDelete(User, {});
  await em.nativeDelete(Config, {});
  await em.nativeDelete(Role, {});

  const roles = [
    { name: 'user', label: 'Utilisateur' },
    { name: 'author', label: 'Auteur' },
    { name: 'translator', label: 'Traducteur' },
    { name: 'moderator', label: 'Modérateur' },
    { name: 'admin', label: 'Admin' },
  ].map((role) => em.create(Role, role));

  em.create(Config, { id: 1, name: 'F95 France' });

  const originWebsites = [
    {
      name: 'F95zone',
      link: 'https://f95zone.to',
      image: faker.image.urlPicsumPhotos(),
    },
    {
      name: 'LewdCorner',
      link: 'https://lewdcorner.com',
      image: faker.image.urlPicsumPhotos(),
    },
    {
      name: 'Autre',
      link: 'https://f95zone.to',
      image: faker.image.urlPicsumPhotos(),
    },
  ].map((origin) => em.create(OriginWebsite, origin));

  const users = Array.from({ length: 10 }, () =>
    em.create(User, {
      role: faker.helpers.arrayElement(roles),
      zitadelId: randomUUID(),
      discordNotification: faker.datatype.boolean(),
    }),
  );

  await em.flush();

  const games = Array.from({ length: 50 }, () =>
    em.create(Game, {
      name: faker.commerce.productName(),
      link: faker.internet.url(),
      origin: faker.helpers.arrayElement(originWebsites),
      threadId: faker.number.int({ min: 0, max: 16_777_215 }),
      imageExternal: faker.image.personPortrait(),
      description: faker.lorem.paragraph(),
      descriptionFr: faker.lorem.paragraph(),
      autoCheck: faker.datatype.boolean(),
      active: true,
    }),
  );

  await em.flush();

  const gameEditions = Array.from({ length: 75 }, () =>
    em.create(GameEdition, {
      game: faker.helpers.arrayElement(games),
      name: faker.commerce.productName(),
      version: faker.system.semver(),
      status: faker.helpers.arrayElement(GAME_EDITION_STATUSES),
      autoCheck: faker.datatype.boolean(),
      active: true,
    }),
  );

  await em.flush();

  const gameTranslations = Array.from({ length: 100 }, () =>
    em.create(GameTranslation, {
      gameEdition: faker.helpers.arrayElement(gameEditions),
      version: faker.system.semver(),
      quality: faker.helpers.arrayElement(GAME_TRANSLATION_QUALITIES),
      type: faker.helpers.arrayElement(GAME_TRANSLATION_TYPES),
      active: true,
    }),
  );

  for (const gameTranslation of gameTranslations) {
    em.create(GameTranslationFile, {
      gameTranslation,
      version: gameTranslation.version,
      externalLink: faker.internet.url(),
      internalLink: null,
    });
  }

  const translators = Array.from({ length: 50 }, () =>
    em.create(Translator, {
      name: faker.person.fullName(),
      user:
        faker.helpers.maybe(() => faker.helpers.arrayElement(users)) ?? null,
      discordId: faker.helpers.maybe(() => faker.string.numeric(18)) ?? null,
      active: true,
    }),
  );

  for (const translator of translators) {
    const linkCount = faker.number.int({ min: 0, max: 3 });
    for (let order = 0; order < linkCount; order++) {
      em.create(TranslatorLink, {
        translator,
        name: faker.internet.domainWord(),
        link: faker.internet.url(),
        order,
      });
    }
  }

  await em.flush();

  //? drizzle-seed's replacement here has the same composite-PK constraint the original
  //? hand-written loop worked around: (gameTranslationId, translatorId) pairs must be unique.
  const maxLinks = Math.min(10, gameTranslations.length * translators.length);
  const pairs = new Set<string>();

  while (pairs.size < maxLinks) {
    const gt = faker.helpers.arrayElement(gameTranslations);
    const t = faker.helpers.arrayElement(translators);
    const key = `${gt.id}-${t.id}`;

    if (pairs.has(key)) continue;
    pairs.add(key);

    em.create(GameTranslationTranslator, {
      gameTranslation: gt,
      translator: t,
      alert: faker.datatype.boolean(),
      type: faker.helpers.arrayElement(['translator', 'proofreader'] as const),
    });
  }

  await em.flush();
  await orm.close();
};

if (import.meta.main) {
  await main();
  process.exit(0);
}
