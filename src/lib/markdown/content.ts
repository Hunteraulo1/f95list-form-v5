import { marked, type Token, type Tokens } from 'marked';

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; children: Inline[] }
  | { kind: 'em'; children: Inline[] }
  | { kind: 'link'; href: string; children: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'br' };

export type ListItem = { blocks: MarkdownBlock[] };

export type MarkdownBlock =
  | { kind: 'heading'; level: number; inlines: Inline[] }
  | { kind: 'paragraph'; inlines: Inline[] }
  | { kind: 'list'; ordered: boolean; items: ListItem[] }
  | { kind: 'hr' }
  | { kind: 'blockquote'; blocks: MarkdownBlock[] }
  | { kind: 'table'; headers: Inline[][]; rows: Inline[][][] };

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const safeHref = (href: string): string | null => {
  try {
    return SAFE_LINK_PROTOCOLS.has(new URL(href).protocol) ? href : null;
  } catch {
    return null;
  }
};

const parseInlines = (tokens: Token[] | undefined): Inline[] => {
  if (!tokens?.length) return [];

  const inlines: Inline[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        if (token.tokens?.length) {
          inlines.push(...parseInlines(token.tokens));
        } else {
          inlines.push({ kind: 'text', text: token.text });
        }
        break;
      case 'strong':
        inlines.push({ kind: 'strong', children: parseInlines(token.tokens) });
        break;
      case 'em':
        inlines.push({ kind: 'em', children: parseInlines(token.tokens) });
        break;
      case 'link': {
        const href = safeHref(token.href);
        const children = parseInlines(token.tokens);

        if (href) {
          inlines.push({ kind: 'link', href, children });
        } else if (children.length) {
          inlines.push(...children);
        } else {
          inlines.push({ kind: 'text', text: token.text });
        }
        break;
      }
      case 'codespan':
        inlines.push({ kind: 'code', text: token.text });
        break;
      case 'br':
        inlines.push({ kind: 'br' });
        break;
      case 'escape':
        inlines.push({ kind: 'text', text: token.text });
        break;
      default:
        //? Images, HTML brut… : jamais interprétés, seul leur texte est conservé.
        if ('text' in token && typeof token.text === 'string') {
          inlines.push({ kind: 'text', text: token.text });
        }
    }
  }

  return inlines;
};

const parseListItem = (item: Tokens.ListItem): ListItem => {
  const nested = item.tokens?.filter((token) => token.type !== 'text') ?? [];

  if (nested.length > 0) return { blocks: parseBlocks(nested) };

  return {
    blocks: [{ kind: 'paragraph', inlines: parseInlines(item.tokens) }],
  };
};

const parseTable = (token: Tokens.Table): MarkdownBlock => ({
  kind: 'table',
  headers: token.header.map((cell) => parseInlines(cell.tokens)),
  rows: token.rows.map((row) => row.map((cell) => parseInlines(cell.tokens))),
});

const parseBlocks = (tokens: Token[]): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading':
        blocks.push({
          kind: 'heading',
          level: token.depth,
          inlines: parseInlines(token.tokens),
        });
        break;
      case 'paragraph':
        blocks.push({ kind: 'paragraph', inlines: parseInlines(token.tokens) });
        break;
      case 'list':
        blocks.push({
          kind: 'list',
          ordered: token.ordered,
          items: token.items.map(parseListItem),
        });
        break;
      case 'hr':
        blocks.push({ kind: 'hr' });
        break;
      case 'blockquote':
        blocks.push({
          kind: 'blockquote',
          blocks: parseBlocks(token.tokens ?? []),
        });
        break;
      case 'table':
        blocks.push(parseTable(token as Tokens.Table));
        break;
      default:
        break;
    }
  }

  return blocks;
};

//? Convertit du Markdown en arbre sûr pour le rendu Svelte, sans jamais passer par du HTML brut :
//? pas de `{@html}`, donc pas de XSS possible, et les liens sont limités à http, https et mailto.
export const parseMarkdownDocument = (markdown: string): MarkdownBlock[] =>
  parseBlocks(marked.lexer(markdown));
