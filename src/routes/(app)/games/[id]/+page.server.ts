import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
  type GameEdition,
  type GameTranslation,
  game,
  gameEdition,
  gameTranslation,
  gameTranslationTranslator,
  type Translator,
  translator,
} from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const slug = parseInt(params.id, 10);

  const rows = await db
    .select({ game, gameEdition, gameTranslation, translator })
    .from(game)
    .where(eq(game.id, slug))
    .leftJoin(gameEdition, eq(gameEdition.gameId, game.id))
    .leftJoin(
      gameTranslation,
      eq(gameTranslation.gameEditionId, gameEdition.id),
    )
    .leftJoin(
      gameTranslationTranslator,
      eq(gameTranslationTranslator.gameTranslationId, gameTranslation.id),
    )
    .leftJoin(
      translator,
      eq(translator.id, gameTranslationTranslator.translatorId),
    )
    .orderBy(asc(gameEdition.name), asc(gameTranslation.version));

  const first = rows[0];
  if (!first) error(404, 'Not found');

  type TranslationWithTranslators = GameTranslation & {
    translators: Translator[];
  };

  const editions = new Map<
    string,
    GameEdition & { gameTranslations: TranslationWithTranslators[] }
  >();
  for (const row of rows) {
    const rowGameEdition = row.gameEdition;
    if (!rowGameEdition) continue;

    let edition = editions.get(rowGameEdition.id);
    if (!edition) {
      edition = { ...rowGameEdition, gameTranslations: [] };
      editions.set(rowGameEdition.id, edition);
    }

    const rowGameTranslation = row.gameTranslation;
    if (!rowGameTranslation) continue;

    let translation = edition.gameTranslations.find(
      (t) => t.id === rowGameTranslation.id,
    );
    if (!translation) {
      translation = { ...rowGameTranslation, translators: [] };
      edition.gameTranslations.push(translation);
    }

    const rowTranslator = row.translator;
    if (
      rowTranslator &&
      !translation.translators.some((t) => t.id === rowTranslator.id)
    ) {
      translation.translators.push(rowTranslator);
    }
  }

  return {
    game: {
      ...first.game,
      gameEditions: [...editions.values()],
    },
  };
};
