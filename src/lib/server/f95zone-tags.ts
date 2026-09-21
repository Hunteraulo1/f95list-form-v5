const TAGS_URL = 'https://f95zone.to/tags/';

//? En dessous, la page n'a pas la forme attendue (refonte du forum, page d'erreur…) : on n'écrit rien.
const MIN_EXPECTED_TAGS = 50;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#039': "'",
  '#39': "'",
};

const decode = (text: string) =>
  text.replace(
    /&(#?\w+);/g,
    (match, entity: string) => ENTITIES[entity] ?? match,
  );

//? Les tags sont les liens `tagCloud-tag` du nuage de la page « Search tags » de F95zone.
export const parseF95zoneTags = (html: string): string[] => {
  const names = new Set<string>();

  for (const [, name] of html.matchAll(
    /href="\/tags\/[^"/]+\/"\s+class="tagCloud-tag[^"]*"[^>]*>([^<]+)</g,
  )) {
    const trimmed = decode(name).trim();
    if (trimmed) names.add(trimmed);
  }

  return [...names];
};

//? Un seul GET, sans authentification, sur la page publique des tags de F95zone.
export const fetchF95zoneTags = async (): Promise<string[]> => {
  const response = await fetch(TAGS_URL, {
    headers: { 'User-Agent': 'f95list-form' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`F95zone a répondu ${response.status}.`);
  }

  const names = parseF95zoneTags(await response.text());
  if (names.length < MIN_EXPECTED_TAGS) {
    throw new Error(
      `La page des tags de F95zone n'a pas la forme attendue (${names.length} tag${names.length > 1 ? 's' : ''} trouvé${names.length > 1 ? 's' : ''}).`,
    );
  }

  return names;
};
