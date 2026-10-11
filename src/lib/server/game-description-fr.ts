import { Game, orm } from '#lib/server/db/index.ts';
import { logger } from '#lib/server/logger.ts';
import { translateToFrench } from '#lib/server/translate.ts';

//? Traduit `description` en arrière-plan et met à jour `game.descriptionFr` une fois terminé, sans
//? bloquer la création du jeu (LibreTranslate peut prendre plusieurs secondes). Comme en v4 : ne
//? s'applique que si personne n'a saisi de description française à la main.
export const translateGameDescriptionInBackground = (
  gameId: number,
  description: string | null,
): void => {
  if (!description) return;

  void translateToFrench(description)
    .then(async (descriptionFr) => {
      if (!descriptionFr) return;

      await orm.em.nativeUpdate(Game, { id: gameId }, { descriptionFr });
    })
    .catch((cause) => {
      logger.warn(
        { err: cause, gameId },
        'traduction de la description en arrière-plan échouée',
      );
    });
};
