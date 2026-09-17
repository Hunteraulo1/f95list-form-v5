import type { GameEdition, GameTranslation } from '$lib/server/db';
import {
  editionStatusName,
  translationQualityName,
  translationTypeName,
} from '$lib/utils/entriesConvert';

export interface GamesFilterableGame {
  name: string;
  threadId: number | null;
  originId: string;
  statuses: GameEdition['status'][];
  qualities: GameTranslation['quality'][];
  types: NonNullable<GameTranslation['type']>[];
  translatorIds: string[];
  tagIds: number[];
}

export interface GamesFilterOptions {
  origins: { id: string; name: string }[];
  translators: { id: string; name: string }[];
  tags: { id: number; name: string }[];
}

export interface GamesFilterValueState {
  value: string;
  label: string;
  checked: boolean;
  inverse: boolean;
}

export const GAMES_FILTER_GROUP_NAMES = [
  'site',
  'status',
  'quality',
  'translationType',
  'translator',
  'tags',
] as const;

export type GamesFilterGroupName = (typeof GAMES_FILTER_GROUP_NAMES)[number];

export interface GamesFilterGroupState {
  name: GamesFilterGroupName;
  title: string;
  values: GamesFilterValueState[];
}

const EDITION_STATUSES = [
  'in_progress',
  'completed',
  'abandoned',
  'on_hold',
] as const;

const TRANSLATION_QUALITIES = [
  'automatic',
  'partial-proofreading',
  'full-proofreading',
  'original-french',
  'unrated',
  'not-working',
] as const;

const TRANSLATION_TYPES = [
  'translation',
  'translation_with_mods',
  'integrated',
  'mods',
  'no_translation',
] as const;

const optionValues = (
  options: readonly { value: string; label: string }[],
): GamesFilterValueState[] =>
  options.map((option) => ({
    value: option.value,
    label: option.label,
    checked: false,
    inverse: false,
  }));

export const createGamesFilterGroups = (
  options: GamesFilterOptions,
): GamesFilterGroupState[] => {
  return [
    {
      name: 'site',
      title: 'Site',
      values: optionValues(
        options.origins.map((origin) => ({
          value: origin.id,
          label: origin.name,
        })),
      ),
    },
    {
      name: 'status',
      title: "Statut de l'édition",
      values: optionValues(
        EDITION_STATUSES.map((status) => ({
          value: status,
          label: editionStatusName(status),
        })),
      ),
    },
    {
      name: 'quality',
      title: 'Qualité de la traduction',
      values: optionValues(
        TRANSLATION_QUALITIES.map((quality) => ({
          value: quality,
          label: translationQualityName(quality),
        })),
      ),
    },
    {
      name: 'translationType',
      title: 'Type de traduction',
      values: optionValues(
        TRANSLATION_TYPES.map((type) => ({
          value: type,
          label: translationTypeName(type) ?? type,
        })),
      ),
    },
    {
      name: 'translator',
      title: 'Traducteur',
      values: optionValues(
        options.translators.map((translator) => ({
          value: translator.id,
          label: translator.name,
        })),
      ),
    },
    {
      name: 'tags',
      title: 'Tags',
      values: optionValues(
        options.tags.map((tag) => ({
          value: String(tag.id),
          label: tag.name,
        })),
      ),
    },
  ];
};

/** Cycle par valeur : neutre -> inclure -> exclure -> neutre.
 * Pour les groupes autres que "tags", dès qu'une valeur du groupe est
 * inclure/exclure, les autres valeurs basculent directement dans le même
 * mode plutôt que de recycler (évite de mélanger inclure et exclure dans
 * un même groupe non-tags). Repris du comportement de la v4. */
export const toggleGamesFilterValue = (
  groups: GamesFilterGroupState[],
  groupName: GamesFilterGroupName,
  value: string,
): GamesFilterGroupState[] => {
  return groups.map((group) => {
    if (group.name !== groupName) return group;

    return {
      ...group,
      values: group.values.map((entry) =>
        entry.value === value ? nextFilterValueState(group, entry) : entry,
      ),
    };
  });
};

const nextFilterValueState = (
  group: GamesFilterGroupState,
  entry: GamesFilterValueState,
): GamesFilterValueState => {
  if (group.name !== 'tags') {
    const others = group.values.filter((v) => v.value !== entry.value);

    if (others.some((v) => v.checked && v.inverse)) {
      return entry.inverse
        ? { ...entry, checked: false, inverse: false }
        : { ...entry, checked: true, inverse: true };
    }

    if (others.some((v) => v.checked && !v.inverse)) {
      return entry.checked
        ? { ...entry, checked: false, inverse: false }
        : { ...entry, checked: true, inverse: false };
    }
  }

  if (!entry.checked) return { ...entry, checked: true, inverse: false };
  if (!entry.inverse) return { ...entry, checked: true, inverse: true };
  return { ...entry, checked: false, inverse: false };
};

export const hasActiveGamesFilters = (
  groups: GamesFilterGroupState[],
): boolean => groups.some((group) => group.values.some((v) => v.checked));

export const gamesFilterGroupSummary = (
  group: GamesFilterGroupState,
): string => {
  const active = group.values.filter((v) => v.checked);
  if (active.length === 0) return group.title;
  return active.map((v) => `${v.inverse ? '!' : ''}${v.label}`).join(', ');
};

const groupSelections = (group: GamesFilterGroupState) => ({
  includes: group.values.filter((v) => v.checked && !v.inverse),
  excludes: group.values.filter((v) => v.checked && v.inverse),
});

/** Une valeur exclue élimine le jeu ; s'il y a des valeurs incluses, le jeu doit
 * en avoir au moins une (tags: doit toutes les avoir, cf. v4). */
const matchesGroup = (
  gameValues: string[],
  group: GamesFilterGroupState,
): boolean => {
  const { includes, excludes } = groupSelections(group);
  if (excludes.some((v) => gameValues.includes(v.value))) return false;
  if (includes.length === 0) return true;

  return group.name === 'tags'
    ? includes.every((v) => gameValues.includes(v.value))
    : includes.some((v) => gameValues.includes(v.value));
};

export const gameMatchesFilters = (
  game: GamesFilterableGame,
  groups: GamesFilterGroupState[],
): boolean => {
  return groups.every((group) => {
    switch (group.name) {
      case 'site':
        return matchesGroup([game.originId], group);
      case 'status':
        return matchesGroup(game.statuses, group);
      case 'quality':
        return matchesGroup(game.qualities, group);
      case 'translationType':
        return matchesGroup(game.types, group);
      case 'translator':
        return matchesGroup(game.translatorIds, group);
      case 'tags':
        return matchesGroup(game.tagIds.map(String), group);
      default:
        return true;
    }
  });
};

/** Recherche par nom (sous-chaîne insensible à la casse) ou par n° de thread exact. */
export const gameMatchesQuery = (
  game: Pick<GamesFilterableGame, 'name' | 'threadId'>,
  query: string,
): boolean => {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const threadIdQuery = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(threadIdQuery) && game.threadId === threadIdQuery) {
    return true;
  }

  return game.name.toLowerCase().includes(trimmed.toLowerCase());
};
