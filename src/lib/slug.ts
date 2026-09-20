//? Le « slug » d'un compte : la partie de l'adresse de son profil (/profile/<slug>). Fabriqué à
//? partir du nom, mais stable et propre (minuscules, chiffres et tirets), et unique en base.
export const SLUG_MAX_LENGTH = 64;

//? Lettres que la décomposition Unicode ne ramène pas à l'ASCII.
const TRANSLITERATIONS: Record<string, string> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
};

const FALLBACK = 'membre';

//? Le slug tiré du nom, vide si le nom n'a ni lettre ni chiffre latin.
export const slugBase = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[ßæœøłđðþ]/g, (letter) => TRANSLITERATIONS[letter] ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '');

//? Un nom sans aucune lettre ni chiffre latin (symboles, kanji…) reçoit un slug générique, rendu
//? unique par son suffixe : réservé aux comptes créés automatiquement (voir `SlugAllocator`).
export const slugify = (name: string) => slugBase(name) || FALLBACK;

//? `base-2`, `base-3`… sans dépasser la longueur maximale.
export const withSuffix = (base: string, attempt: number) => {
  const suffix = `-${attempt}`;

  return (
    base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, '') + suffix
  );
};

//? Attribue des slugs uniques en mémoire : pour les scripts qui créent beaucoup de comptes d'un
//? coup (seed, migration v4) sans interroger la base à chaque fois.
export class SlugAllocator {
  readonly #taken: Set<string>;

  constructor(taken: Iterable<string> = []) {
    this.#taken = new Set(taken);
  }

  allocate(name: string) {
    const base = slugify(name);
    let slug = base;

    for (let attempt = 2; this.#taken.has(slug); attempt++) {
      slug = withSuffix(base, attempt);
    }

    this.#taken.add(slug);
    return slug;
  }

  //? À appeler quand un compte change de nom : son ancien slug redevient libre.
  release(slug: string) {
    this.#taken.delete(slug);
  }
}
