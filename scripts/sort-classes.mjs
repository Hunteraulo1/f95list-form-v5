// Trie les classes Tailwind des .svelte avec l'ordre officiel de Tailwind v4.
// Usage : node scripts/sort-classes.mjs [--check] [fichiers...]  (sans fichier : tout src/)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { __unstable__loadDesignSystem } from '@tailwindcss/node';

const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const files = args.filter((a) => !a.startsWith('--'));

const designSystem = await __unstable__loadDesignSystem(
  readFileSync(join(root, 'src/app.css'), 'utf8'),
  { base: join(root, 'src') },
);

const STRING = /(["'`])([^"'`]+)\1/dg;
const PATTERNS = [
  { re: /\bclass\s*=\s*["']([^"'{}]+)["']/dg },
  { re: /\bclass\s*=\s*\{([^}]*)\}/dg, inner: STRING },
  { re: /:\s*ClassValue\s*=\s*["'`]([^"'`]+)["'`]/dg },
];

function sortClasses(value) {
  if (value.includes('{')) return value;
  const classes = value.split(/\s+/).filter(Boolean);
  const order = new Map(designSystem.getClassOrder(classes));
  const sorted = classes
    .map((name, index) => ({ name, index, weight: order.get(name) ?? null }))
    .sort((a, b) => {
      if (a.weight === b.weight) return a.index - b.index;
      if (a.weight === null) return -1;
      if (b.weight === null) return 1;
      return a.weight < b.weight ? -1 : 1;
    })
    .map((c) => c.name)
    .join(' ');
  return value.trim() === sorted ? value : sorted;
}

function replaceGroup(text, re, fn) {
  let out = '';
  let last = 0;
  for (const match of text.matchAll(re)) {
    const [start, end] = match.indices[match.indices.length - 1];
    out += text.slice(last, start) + fn(match[match.length - 1], start);
    last = end;
  }
  return out + text.slice(last);
}

function sortText(text, report) {
  const sortValue = (value) => {
    const sorted = sortClasses(value);
    if (sorted !== value) report.push([value.trim(), sorted]);
    return sorted;
  };
  let result = text;
  for (const { re, inner } of PATTERNS) {
    result = replaceGroup(result, re, (value) =>
      inner
        ? replaceGroup(value, inner, (str) => sortValue(str))
        : sortValue(value),
    );
  }
  return result;
}

function findSvelteFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findSvelteFiles(path);
    return path.endsWith('.svelte') ? [path] : [];
  });
}

const targets = (files.length ? files : findSvelteFiles(join(root, 'src')))
  .map((f) => resolve(f))
  .filter((f) => f.endsWith('.svelte'));

let changedFiles = 0;
for (const file of targets) {
  const source = readFileSync(file, 'utf8');
  const report = [];
  const result = sortText(source, report);
  if (result === source) continue;
  changedFiles++;
  console.log(
    `${check ? 'à trier' : 'trié'} : ${file.replace(`${root}/`, '')} (${report.length})`,
  );
  if (check) for (const [a, b] of report) console.log(`  - ${a}\n  + ${b}`);
  else writeFileSync(file, result);
}

console.log(
  `${changedFiles} fichier(s) ${check ? 'à modifier' : 'modifié(s)'} sur ${targets.length}`,
);
if (check && changedFiles > 0) process.exit(1);
