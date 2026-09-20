import type { EditorView } from '@codemirror/view';

export type MarkdownAction =
  | 'bold'
  | 'italic'
  | 'link'
  | 'heading'
  | 'ul'
  | 'ol'
  | 'quote'
  | 'code'
  | 'hr';

interface TextEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  changeFrom: number;
  changeTo: number;
  insert: string;
}

const wrapSelection = (
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
  placeholder: string,
): TextEdit => {
  const selected = value.slice(start, end);
  const insert = prefix + (selected || placeholder) + suffix;
  const base = { changeFrom: start, changeTo: end, insert };
  const next = value.slice(0, start) + insert + value.slice(end);

  //? Sans sélection, le texte d'exemple reste sélectionné pour être remplacé en tapant.
  if (selected) {
    const cursor = start + insert.length;
    return {
      ...base,
      value: next,
      selectionStart: cursor,
      selectionEnd: cursor,
    };
  }

  const selectStart = start + prefix.length;
  return {
    ...base,
    value: next,
    selectionStart: selectStart,
    selectionEnd: selectStart + placeholder.length,
  };
};

const insertLink = (value: string, start: number, end: number): TextEdit => {
  const label = value.slice(start, end) || 'texte';
  const insert = `[${label}](https://)`;
  const urlStart = start + label.length + 3;

  return {
    value: value.slice(0, start) + insert + value.slice(end),
    selectionStart: urlStart,
    selectionEnd: urlStart + 'https://'.length,
    changeFrom: start,
    changeTo: end,
    insert,
  };
};

//? Applique `transform` à chaque ligne touchée par la sélection.
const editLines = (
  value: string,
  start: number,
  end: number,
  transform: (line: string, index: number) => string,
): TextEdit => {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndIndex = value.indexOf('\n', end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const lines = value.slice(lineStart, lineEnd).split('\n');

  const edited = lines.map(transform);
  const insert = edited.join('\n');
  const offset = insert.length - (lineEnd - lineStart);
  const cursor = end + offset;

  return {
    value: value.slice(0, lineStart) + insert + value.slice(lineEnd),
    selectionStart: cursor,
    selectionEnd: cursor,
    changeFrom: lineStart,
    changeTo: lineEnd,
    insert,
  };
};

const prefixLines = (
  value: string,
  start: number,
  end: number,
  prefix: string,
  skipIf: RegExp,
) =>
  editLines(value, start, end, (line) =>
    skipIf.test(line) ? line : prefix + line,
  );

const prefixOrderedLines = (value: string, start: number, end: number) => {
  let index = 0;

  return editLines(value, start, end, (line) => {
    if (/^\s*\d+\.\s/.test(line)) return line;

    index += 1;
    return `${index}. ${line}`;
  });
};

const applyTextEdit = (
  value: string,
  start: number,
  end: number,
  action: MarkdownAction,
): TextEdit => {
  switch (action) {
    case 'bold':
      return wrapSelection(value, start, end, '**', '**', 'gras');
    case 'italic':
      return wrapSelection(value, start, end, '*', '*', 'italique');
    case 'code':
      return wrapSelection(value, start, end, '`', '`', 'code');
    case 'link':
      return insertLink(value, start, end);
    case 'heading':
      return prefixLines(value, start, end, '## ', /^#{1,6}\s/);
    case 'ul':
      return prefixLines(value, start, end, '- ', /^\s*[-*]\s/);
    case 'ol':
      return prefixOrderedLines(value, start, end);
    case 'quote':
      return prefixLines(value, start, end, '> ', /^\s*>\s/);
    case 'hr': {
      const insert =
        start > 0 && value[start - 1] !== '\n' ? '\n\n---\n' : '---\n';
      const cursor = start + insert.length;

      return {
        value: value.slice(0, start) + insert + value.slice(end),
        selectionStart: cursor,
        selectionEnd: cursor,
        changeFrom: start,
        changeTo: end,
        insert,
      };
    }
  }
};

//? Dans CodeMirror la modification passe par une transaction (l'historique annuler/rétablir est
//? conservé) et retourne `null` ; sur un simple textarea, retourne le nouveau texte à appliquer.
export const applyMarkdownAction = (
  action: MarkdownAction,
  target: { view?: EditorView | null; textarea?: HTMLTextAreaElement | null },
): TextEdit | null => {
  if (target.view) {
    const { from, to } = target.view.state.selection.main;
    const edit = applyTextEdit(
      target.view.state.doc.toString(),
      from,
      to,
      action,
    );

    target.view.dispatch({
      changes: {
        from: edit.changeFrom,
        to: edit.changeTo,
        insert: edit.insert,
      },
      selection: { anchor: edit.selectionStart, head: edit.selectionEnd },
    });
    target.view.focus();

    return null;
  }

  if (target.textarea) {
    return applyTextEdit(
      target.textarea.value,
      target.textarea.selectionStart,
      target.textarea.selectionEnd,
      action,
    );
  }

  return null;
};

export const MARKDOWN_TOOLBAR: {
  action: MarkdownAction;
  label: string;
  shortcut?: string;
}[] = [
  { action: 'bold', label: 'Gras', shortcut: 'Ctrl+B' },
  { action: 'italic', label: 'Italique', shortcut: 'Ctrl+I' },
  { action: 'link', label: 'Lien' },
  { action: 'heading', label: 'Titre' },
  { action: 'ul', label: 'Liste à puces' },
  { action: 'ol', label: 'Liste numérotée' },
  { action: 'quote', label: 'Citation' },
  { action: 'code', label: 'Code' },
  { action: 'hr', label: 'Séparateur' },
];
