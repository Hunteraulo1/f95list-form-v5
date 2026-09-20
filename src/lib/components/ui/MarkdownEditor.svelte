<script lang="ts">
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { type EditorView, keymap } from '@codemirror/view';
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  Quote,
} from '@lucide/svelte';
import { onMount, tick } from 'svelte';
import type CodeMirrorComponent from 'svelte-codemirror-editor';
import { browser } from '$app/environment';
import MarkdownContent from '$lib/components/ui/MarkdownContent.svelte';
import { parseMarkdownDocument } from '$lib/markdown/content';
import {
  applyMarkdownAction,
  MARKDOWN_TOOLBAR,
  type MarkdownAction,
} from '$lib/markdown/toolbar';
import { cn } from '$lib/utils/cn';

interface Props {
  value?: string;
  //? Nom du champ envoyé avec le formulaire.
  name: string;
  maxLength: number;
  placeholder?: string;
}

let {
  value = $bindable(''),
  name,
  maxLength,
  placeholder = 'Écrivez ici…',
}: Props = $props();

const icons: Record<MarkdownAction, LucideIcon> = {
  bold: Bold,
  italic: Italic,
  link: Link,
  heading: Heading2,
  ul: List,
  ol: ListOrdered,
  quote: Quote,
  code: Code,
  hr: Minus,
};

let Editor = $state<typeof CodeMirrorComponent | null>(null);
let view = $state<EditorView | null>(null);
let fallback = $state<HTMLTextAreaElement | null>(null);
let mode = $state<'write' | 'preview'>('write');

const preview = $derived(
  mode === 'preview' ? parseMarkdownDocument(value) : [],
);

const toolbar = MARKDOWN_TOOLBAR.map((item) => ({
  ...item,
  icon: icons[item.action],
}));

const run = async (action: MarkdownAction) => {
  const edit = applyMarkdownAction(action, {
    view,
    textarea: view ? null : fallback,
  });

  //? Simple textarea (avant le chargement de CodeMirror) : on applique le résultat nous-mêmes.
  if (edit) {
    value = edit.value;
    await tick();
    fallback?.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    fallback?.focus();
  }
};

const extensions = [
  markdown({ base: markdownLanguage, codeLanguages: [] }),
  //? Au-delà de la limite, la modification est refusée (frappe comme collage).
  EditorState.transactionFilter.of((transaction) =>
    !transaction.docChanged || transaction.newDoc.length <= maxLength
      ? transaction
      : [],
  ),
  keymap.of(
    (['bold', 'italic'] as const).map((action) => ({
      key: action === 'bold' ? 'Mod-b' : 'Mod-i',
      run: (target: EditorView) => {
        applyMarkdownAction(action, { view: target });
        return true;
      },
    })),
  ),
];

//? CodeMirror pèse lourd et n'a pas de sens côté serveur : chargé à l'affichage. En attendant (et
//? sans JavaScript), un simple textarea prend le relais.
onMount(async () => {
  if (!browser) return;

  Editor = (await import('svelte-codemirror-editor')).default;
});
</script>

<div class="flex w-full flex-col gap-2">
  <div class="flex items-center justify-between gap-2">
    <div class="flex gap-1" role="tablist" aria-label="Mode de l'éditeur">
      {#each [
   { key: 'write', label: 'Écrire' },
   { key: 'preview', label: 'Aperçu' },
 ] as tab (tab.key)}
        <button
          type="button"
          role="tab"
          aria-selected={mode === tab.key}
          class={cn(
  'cursor-pointer rounded-lg px-3 py-1 text-sm font-bold transition-all',
  mode === tab.key ? 'bg-primary text-neutral-content' : 'hover:bg-base-100',
)}
          onclick={() => (mode = tab.key as 'write' | 'preview')}
        >
          {tab.label}
        </button>
      {/each}
    </div>
    <span
      class={cn('text-xs', value.length >= maxLength && 'font-bold text-error')}
    >
      {value.length}
      / {maxLength}
    </span>
  </div>

  <div
    class="overflow-hidden rounded-xl border-2 border-base-content/30 bg-base-100 text-base-content focus-within:border-primary"
  >
    <!-- L'éditeur reste monté quand on passe sur « Aperçu » (masqué seulement) : on retrouve
         le curseur, le défilement et l'historique annuler/rétablir en revenant sur « Écrire ». -->
    <div class={mode === 'write' ? '' : 'hidden'}>
      <div
        class="flex flex-wrap gap-1 border-b border-base-content/20 bg-base-200 p-1"
        role="toolbar"
        aria-label="Mise en forme Markdown"
      >
        {#each toolbar as item (item.action)}
          <button
            type="button"
            class="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-base-100"
            title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
            aria-label={item.label}
            onclick={() => run(item.action)}
          >
            <item.icon size="14" aria-hidden="true" />
            <span class="hidden sm:inline">{item.label}</span>
          </button>
        {/each}
      </div>

      {#if Editor}
        <!-- `nodebounce` : sans lui, la valeur remonte 300 ms après la dernière frappe, et un clic
             rapide sur « Enregistrer » perdrait la fin du texte. -->
        <Editor
          bind:value
          {extensions}
          nodebounce
          {placeholder}
          lineNumbers={false}
          lineWrapping={true}
          foldGutter={false}
          autocompletion={false}
          onready={(ready: EditorView) => (view = ready)}
          styles={{
  '&': { width: '100%', minHeight: '12rem', backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '0.875rem',
    lineHeight: '1.6',
  },
  '.cm-content': { padding: '0.75rem 1rem' },
  '.cm-gutters': { display: 'none' },
}}
        />
      {:else}
        <textarea
          bind:this={fallback}
          class="min-h-48 w-full resize-y bg-transparent px-4 py-3 font-mono text-sm outline-none"
          {placeholder}
          maxlength={maxLength}
          aria-label="Contenu (Markdown)"
          bind:value
        ></textarea>
      {/if}
    </div>

    {#if mode === 'preview'}
      <div class="min-h-48 p-4">
        {#if value.trim()}
          <MarkdownContent document={preview} />
        {:else}
          <p class="text-sm opacity-60">Rien à afficher pour l'instant.</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<input type="hidden" {name} {value}>
