<script lang="ts">
import Button from '$lib/components/ui/Button.svelte';
import Modal from '$lib/components/ui/Modal.svelte';

export interface GameReport {
  reason: string;
  message?: string;
  translationId?: string;
}

export interface ReportTranslationOption {
  id: string;
  label: string;
}

interface Props {
  open?: boolean;
  gameName: string;
  translations?: ReportTranslationOption[];
  onsubmit?: (report: GameReport) => void;
}

let {
  open = $bindable(false),
  gameName,
  translations = [],
  onsubmit,
}: Props = $props();

type ReasonMode = 'required' | 'optional' | 'none';

const allReasons: {
  value: string;
  label: string;
  needsTranslation: boolean;
  needsReason: ReasonMode;
}[] = [
  {
    value: 'dead-link',
    label: 'Lien du jeu mort',
    needsTranslation: false,
    needsReason: 'none',
  },
  {
    value: 'bad-info',
    label: 'Informations du jeu erronées',
    needsTranslation: false,
    needsReason: 'optional',
  },
  {
    value: 'bad-file',
    label: 'Fichier de traduction corrompu ou incorrect',
    needsTranslation: true,
    needsReason: 'optional',
  },
  {
    value: 'bad-translation',
    label: 'Erreur de traduction',
    needsTranslation: true,
    needsReason: 'required',
  },
  {
    value: 'other',
    label: 'Autre',
    needsTranslation: false,
    needsReason: 'required',
  },
];

const fieldStyle =
  'shadow-mini w-full rounded-xl border-2 border-transparent bg-neutral-content px-4 text-sm font-bold text-primary transition-all outline-none hover:border-primary focus:border-primary';

// Sans traduction, les motifs qui en visent une n'ont pas de sens
const reasons = $derived(
  allReasons.filter(
    ({ needsTranslation }) => !needsTranslation || translations.length > 0,
  ),
);

let reason = $state(allReasons[0].value);
let translationId = $state<string | undefined>();
let message = $state('');

const current = $derived(allReasons.find(({ value }) => value === reason));
const needsTranslation = $derived(current?.needsTranslation ?? false);
const needsReason = $derived<ReasonMode>(current?.needsReason ?? 'none');

const canSubmit = $derived(
  (needsReason !== 'required' || message.trim().length > 0) &&
    (!needsTranslation || translationId !== undefined),
);

const reset = () => {
  reason = allReasons[0].value;
  translationId = undefined;
  message = '';
};

const submit = () => {
  if (!canSubmit) return;

  onsubmit?.({
    reason,
    message: (needsReason !== 'none' && message.trim()) || undefined,
    translationId: needsTranslation ? translationId : undefined,
  });
  open = false;
  reset();
};
</script>

<Modal
  bind:open
  title="Signaler un problème"
  description="Un souci avec « {gameName} » ? Dites-nous ce qui ne va pas."
>
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm font-bold">
      Type de problème
      <select class="{fieldStyle} h-9 cursor-pointer" bind:value={reason}>
        {#each reasons as item}
          <option value={item.value}>{item.label}</option>
        {/each}
      </select>
    </label>

    {#if needsTranslation}
      <label class="flex flex-col gap-1 text-sm font-bold">
        Traduction concernée
        <select
          class="{fieldStyle} h-9 cursor-pointer"
          bind:value={translationId}
        >
          <option value={undefined} disabled>Choisir une traduction…</option>
          {#each translations as item}
            <option value={item.id}>{item.label}</option>
          {/each}
        </select>
      </label>
    {/if}

    {#if needsReason !== 'none'}
      <label class="flex flex-col gap-1 text-sm font-bold">
        Description{needsReason === 'optional' ? ' (optionnelle)' : ''}
        <textarea
          class="{fieldStyle} min-h-28 resize-y py-2"
          placeholder="Décrivez le problème rencontré…"
          bind:value={message}
        ></textarea>
      </label>
    {/if}
  </div>

  {#snippet footer()}
    <Button label="Annuler" inline onclick={() => (open = false)} />
    <Button
      label="Envoyer"
      classes={!canSubmit && 'pointer-events-none opacity-50'}
      onclick={submit}
    />
  {/snippet}
</Modal>
