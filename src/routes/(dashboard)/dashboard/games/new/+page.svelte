<script lang="ts">
import { Copy, Link2, Link2Off } from '@lucide/svelte';
import { tick, untrack } from 'svelte';
import { enhance } from '$app/forms';
import GameField from '$lib/components/games/GameField.svelte';
import TagPicker from '$lib/components/games/TagPicker.svelte';
import UserPicker, {
  type PickedUser,
} from '$lib/components/games/UserPicker.svelte';
import WizardSteps from '$lib/components/games/WizardSteps.svelte';
import Button from '$lib/components/ui/Button.svelte';
import {
  computeFieldState,
  DESCRIPTION_MAX_LENGTH,
  GAME_NAME_MAX_LENGTH,
  NO_TRANSLATION_QUALITY,
  type TranslationType,
  threadLink,
  translationShape,
  VERSION_MAX_LENGTH,
} from '$lib/games/game-form';
import { IMAGE_HOSTS_LABEL, parseImageUrl } from '$lib/image-hosts';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

//? L'assistant de la v4 : Site → Thread → Infos jeu → Traduction, puis Auto-check et Validation
//? pour ceux qui ont le droit de choisir l'auto-check. Chaque champ reste dans le formulaire
//? (simplement masqué hors de son étape), donc l'envoi contient tout.
const STEP = {
  site: 0,
  thread: 1,
  infos: 2,
  translation: 3,
  autoCheck: 4,
  review: 5,
} as const;

const stepLabels = $derived(
  data.canManageAutoCheck
    ? ['Site', 'Thread', 'Infos jeu', 'Traduction', 'Auto-check', 'Validation']
    : ['Site', 'Thread', 'Infos jeu', 'Traduction'],
);
const maxStep = $derived(stepLabels.length - 1);

const game = $state({
  originId: untrack(() => data.defaultOriginId),
  threadId: '',
  link: '',
  name: '',
  image: '',
  description: '',
  descriptionFr: '',
  editionVersion: '',
  editionName: '',
  status: 'in_progress',
  type: 'translation' as TranslationType,
  quality: 'automatic',
  translationVersion: '',
  translationLink: '',
  autoCheck: true,
  editionAutoCheck: false,
});
let tags = $state<number[]>([]);
let translators = $state<PickedUser[]>([]);
let proofreaders = $state<PickedUser[]>([]);
let selfTranslator = $state(true);
let step = $state<number>(STEP.site);
let submitting = $state(false);
let imageFocused = $state(false);

interface Duplicate {
  id: number;
  name: string;
  translations: {
    id: string;
    edition: string | null;
    type: string;
    version: string;
  }[];
}
let duplicate = $state<Duplicate | null>(null);
let checking = $state(false);

const origin = $derived(data.origins.find(({ id }) => id === game.originId));
const hasThread = $derived(origin?.hasThread ?? false);
const autoCheckAvailable = $derived(origin?.autoCheck ?? false);
const shape = $derived(translationShape(game.type));
const threadValid = $derived(
  /^\d+$/.test(game.threadId.trim()) && Number(game.threadId) > 0,
);
//? Site à thread : le lien se déduit du numéro (v4) ; sinon il est saisi.
const gameLink = $derived(
  hasThread && origin && threadValid
    ? (threadLink(origin.name, Number(game.threadId)) ?? '')
    : hasThread
      ? ''
      : game.link.trim(),
);
const translatorCount = $derived((selfTranslator ? 1 : 0) + translators.length);
const fieldState = $derived(
  computeFieldState({
    hasThread,
    threadId: game.threadId,
    link: game.link,
    name: game.name,
    image: game.image,
    tagCount: tags.length,
    description: game.description,
    editionVersion: game.editionVersion,
    type: game.type,
    translationVersion: game.translationVersion,
    translationLink: game.translationLink,
    translatorCount,
  }),
);
const blockFinalSubmit = $derived(fieldState.blocking || duplicate !== null);
const blockNextStep = $derived(
  step === STEP.thread && (!threadValid || duplicate !== null),
);
const imagePreview = $derived.by(() => {
  const parsed = parseImageUrl(game.image);

  return parsed.ok ? parsed.url : null;
});

const errors = $derived<Record<string, string>>(form?.errors ?? {});
const errorEntries = $derived(Object.entries(errors));

//? Un champ appartient à une étape ; l'étape de validation les montre tous.
const hiddenOutside = (...steps: number[]) =>
  !steps.includes(step) && step !== STEP.review;

const field =
  'shadow-mini h-9 w-full min-w-0 rounded-xl border-2 bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60';
const tone = (key: string) =>
  fieldState.errors[key] || errors[key]
    ? 'border-error'
    : fieldState.warns[key]
      ? 'border-warning'
      : 'border-transparent';
const iconButton =
  'shadow-mini mt-0 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-transparent bg-primary text-neutral-content';

const changeOrigin = () => {
  duplicate = null;
  //? Comme en v4 : l'auto-check n'existe que pour F95zone.
  game.autoCheck = autoCheckAvailable;
  if (!autoCheckAvailable) game.editionAutoCheck = false;
};

//? Le type de traduction fige certains champs, comme en v4.
const changeType = () => {
  if (game.type === 'no_translation') {
    game.translationVersion = '';
    game.translationLink = '';
    game.quality = NO_TRANSLATION_QUALITY;
  } else if (game.type === 'integrated') {
    game.translationVersion = 'Intégrée';
    game.translationLink = '';
  } else if (game.translationVersion === 'Intégrée') {
    game.translationVersion = '';
  }
  //? La qualité n'est figée que pour « Pas de traduction » : on la libère en en sortant.
  if (
    game.type !== 'no_translation' &&
    game.quality === NO_TRANSLATION_QUALITY
  ) {
    game.quality = 'automatic';
  }
};

const checkThread = async () => {
  duplicate = null;
  if (!hasThread || !threadValid) return;

  checking = true;
  try {
    const response = await fetch(
      `/dashboard/games/new/check?originId=${encodeURIComponent(game.originId)}&threadId=${encodeURIComponent(game.threadId.trim())}`,
    );
    const result = await response.json();
    duplicate = result.exists ? result.game : null;
  } catch {
    //? Le serveur refusera un doublon à la création : la vérification n'est qu'un confort.
  } finally {
    checking = false;
  }
};

//? Entrée dans un champ passe à l'étape suivante (sans bouton d'envoi, le navigateur ne le ferait pas).
const advanceOnEnter = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement;
  if (
    event.defaultPrevented ||
    event.key !== 'Enter' ||
    step >= maxStep ||
    target.tagName !== 'INPUT'
  )
    return;
  if ((target as HTMLInputElement).type === 'checkbox' || blockNextStep) return;

  event.preventDefault();
  void changeStep(1);
};

const changeStep = async (amount: number) => {
  let target = Math.min(Math.max(step + amount, 0), maxStep);

  //? Un site sans thread saute l'étape « Thread » ; sans auto-check, l'étape « Auto-check ».
  if (target === STEP.thread && !hasThread) target += amount;
  if (target === STEP.autoCheck && !autoCheckAvailable) target += amount;

  if (step === STEP.thread && amount > 0) {
    await checkThread();
    if (duplicate) return;
  }

  step = Math.min(Math.max(target, 0), maxStep);
};

//? Les erreurs du serveur ramènent à l'étape du premier champ fautif.
const stepOfError = (key: string): number => {
  if (key === 'originId') return STEP.site;
  if (key === 'threadId') return STEP.thread;
  if (
    [
      'name',
      'link',
      'image',
      'description',
      'descriptionFr',
      'tags',
      'editionVersion',
    ].includes(key)
  ) {
    return STEP.infos;
  }

  return STEP.translation;
};

const goToFirstError = async () => {
  const keys = Object.keys(form?.errors ?? {});
  if (keys.length === 0) return;

  const target = Math.min(...keys.map(stepOfError));
  step =
    target === STEP.thread && !hasThread
      ? STEP.site
      : Math.min(target, maxStep);
  await tick();
  document.querySelector('[data-error]')?.scrollIntoView({ block: 'center' });
};
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-1 sm:px-4">
  <div class="rounded-xl bg-base-100 p-4 sm:p-6">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <h1 class="text-xl font-bold sm:text-2xl">Ajouter un jeu</h1>
      <div class="hidden flex-1 px-6 xl:block">
        <WizardSteps labels={stepLabels} current={step} />
      </div>
      <span
        class="w-fit rounded-xl border-2 border-primary px-3 py-1 text-sm font-bold text-primary"
      >
        Étape {step + 1} / {maxStep + 1}
      </span>
    </div>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <form
    method="POST"
    action="?/create"
    class="relative flex w-full flex-col gap-5 rounded-xl bg-base-100 p-4 sm:p-6"
    autocomplete="off"
    onkeydown={advanceOnEnter}
    use:enhance={({ cancel }) => {
  //? Seule la dernière étape envoie : partout ailleurs, on avance.
  if (step < maxStep) {
    cancel();
    void changeStep(1);
    return;
  }

  submitting = true;

  return async ({ update }) => {
    await update({ reset: false });
    submitting = false;
    await goToFirstError();
  };
}}
  >
    {#if errorEntries.length > 0}
      <div
        class="rounded-xl bg-error/20 p-3 text-sm text-error"
        role="alert"
        data-error
      >
        <p class="font-bold">
          Corrigez les champs signalés avant d'ajouter le jeu :
        </p>
        <ul class="mt-1 list-inside list-disc">
          {#each errorEntries as [key, message] (key)}
            <li>{message}</li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if origin?.name === 'Autre'}
      <div class="rounded-xl bg-warning/20 p-3 text-sm" role="status">
        <strong>Site « Autre » :</strong>
        n'ajoutez pas d'images illégales (contenu lolicon ou assimilé interdit
        par la loi). Utilisez uniquement une vignette conforme.
      </div>
    {/if}

    {#if duplicate}
      <div
        class="flex flex-col gap-2 rounded-xl bg-warning/20 p-3 text-sm"
        role="alert"
      >
        <span class="font-bold">Attention — conflit possible</span>
        <ul class="list-inside list-disc">
          <li>
            Un jeu avec ce thread existe déjà dans la base : «
            {duplicate.name}
            ».
          </li>
        </ul>
        {#if duplicate.translations.length > 0}
          <div>
            <p class="mb-1 text-xs font-bold opacity-80">
              Traductions déjà enregistrées :
            </p>
            <ul class="flex flex-col gap-1">
              {#each duplicate.translations as translation (translation.id)}
                <li class="rounded-lg bg-warning/20 px-2 py-1 text-xs">
                  <span class="font-bold"
                    >{translation.edition ?? 'Édition de base'}</span
                  >
                  —
                  {translation.type}{translation.version ? ` (${translation.version})` : ''}
                </li>
              {/each}
            </ul>
          </div>
        {:else}
          <p class="text-xs opacity-70">
            Aucune traduction enregistrée pour ce jeu.
          </p>
        {/if}
        <a
          class="w-fit rounded-xl border-2 border-base-content px-3 py-1 text-xs font-bold hover:bg-base-200"
          href="/games/{duplicate.id}"
        >
          Voir la fiche du jeu
        </a>
      </div>
    {/if}

    <div
      class="flex min-h-11 items-center gap-3 rounded-xl bg-base-200/60 px-4 py-3 text-sm"
    >
      <span>
        <span class="font-bold">Section active :</span>
        {stepLabels[step]}
      </span>
      {#if checking}
        <span class="text-xs opacity-70">Vérification du thread…</span>
      {/if}
    </div>

    <div class="rounded-xl bg-base-200/40 px-4 py-3">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <h2 class="text-sm font-bold">Jeu en cours</h2>
        {#if duplicate}
          <span
            class="rounded-lg bg-warning px-2 py-0.5 text-xs font-bold text-warning-content"
          >
            Conflit thread
          </span>
        {/if}
      </div>
      <div
        class="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4"
      >
        {#each [
   ['Site', origin?.name ?? '—'],
   ['Thread ID', game.threadId.trim() || '—'],
   ['Nom', game.name.trim() || '—'],
   ['Version', game.editionVersion.trim() || '—'],
 ] as [title, value] (title)}
          <div class="rounded-xl bg-base-100 px-3 py-2">
            <p class="opacity-60">{title}</p>
            <p class="truncate font-bold">{value}</p>
          </div>
        {/each}
      </div>
    </div>

    <div
      class="grid w-full grid-cols-1 gap-5 rounded-xl border-2 border-base-300 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      <!-- Étape « Site » -->
      <GameField
        label="Plateforme"
        id="originId"
        hidden={hiddenOutside(STEP.site)}
      >
        <select
          id="originId"
          name="originId"
          class="{field} cursor-pointer {tone('originId')}"
          bind:value={game.originId}
          onchange={changeOrigin}
        >
          {#each data.origins as item (item.id)}
            <option value={item.id}>{item.name}</option>
          {/each}
        </select>
      </GameField>

      <!-- Étape « Thread » -->
      <GameField
        label="ID du thread"
        id="threadId"
        hidden={hiddenOutside(STEP.thread) || !hasThread}
      >
        <input
          id="threadId"
          name="threadId"
          type="text"
          inputmode="numeric"
          placeholder="ID du thread"
          class="{field} {tone('threadId')}"
          bind:value={game.threadId}
          oninput={() => (duplicate = null)}
          onblur={checkThread}
        >
      </GameField>

      <!-- Étape « Infos jeu » -->
      <GameField
        label="Nom du jeu"
        id="name"
        hidden={hiddenOutside(STEP.infos)}
      >
        <input
          id="name"
          name="name"
          placeholder="Nom du jeu"
          maxlength={GAME_NAME_MAX_LENGTH}
          class="{field} {tone('name')}"
          bind:value={game.name}
        >
      </GameField>

      <GameField
        label="Lien du jeu"
        id="link"
        hidden={hiddenOutside(STEP.infos)}
      >
        {#if hasThread}
          <input
            id="link"
            class="{field} border-transparent"
            placeholder="Lien du jeu"
            value={gameLink}
            disabled
          >
        {:else}
          <input
            id="link"
            name="link"
            type="url"
            placeholder="Lien du jeu"
            class="{field} {tone('link')}"
            bind:value={game.link}
          >
        {/if}
        {#if gameLink}
          <a
            href={gameLink}
            target="_blank"
            rel="noopener noreferrer"
            class={iconButton}
            aria-label="Ouvrir le lien du jeu"
          >
            <Link2 size="16" />
          </a>
        {:else}
          <span class="{iconButton} opacity-50" aria-hidden="true"
            ><Link2Off size="16" /></span
          >
        {/if}
      </GameField>

      <GameField
        label="Lien de l'image du jeu"
        id="image"
        hidden={hiddenOutside(STEP.infos)}
        class="relative"
      >
        <input
          id="image"
          name="image"
          type="text"
          placeholder="Lien de l'image du jeu"
          class="{field} {tone('image')}"
          bind:value={game.image}
          onfocus={() => (imageFocused = true)}
          onblur={() => (imageFocused = false)}
        >
        {#if imageFocused}
          <div
            class="absolute top-full left-0 z-20 mt-1 rounded-xl border-2 border-base-content bg-base-100 p-2 shadow-lg"
          >
            {#if imagePreview}
              <img
                src={imagePreview}
                alt="Aperçu de la vignette"
                class="max-h-40 rounded-lg"
                referrerpolicy="no-referrer"
              >
            {:else}
              <p class="w-56 text-xs">Hébergée sur : {IMAGE_HOSTS_LABEL}.</p>
            {/if}
          </div>
        {/if}
      </GameField>

      <GameField
        label="Version du jeu"
        id="editionVersion"
        hidden={hiddenOutside(STEP.infos)}
        help="Dernière version sortie du jeu pour la branche concernée (pas la version de la traduction)."
      >
        <input
          id="editionVersion"
          name="editionVersion"
          placeholder="Version du jeu"
          maxlength={VERSION_MAX_LENGTH}
          class="{field} {tone('editionVersion')}"
          bind:value={game.editionVersion}
        >
      </GameField>

      <GameField
        label="Description du jeu"
        id="description"
        hidden={hiddenOutside(STEP.infos)}
      >
        <textarea
          id="description"
          name="description"
          placeholder="Description du jeu"
          maxlength={DESCRIPTION_MAX_LENGTH}
          class="{field} h-10 max-h-32 min-h-10 resize-y py-2 {tone('description')}"
          bind:value={game.description}
        ></textarea>
      </GameField>

      <GameField
        label="Description française"
        id="descriptionFr"
        hidden={hiddenOutside(STEP.infos)}
      >
        <textarea
          id="descriptionFr"
          name="descriptionFr"
          placeholder="Description française"
          maxlength={DESCRIPTION_MAX_LENGTH}
          class="{field} h-10 max-h-32 min-h-10 resize-y py-2 {tone('descriptionFr')}"
          bind:value={game.descriptionFr}
        ></textarea>
      </GameField>

      <GameField
        label="Tags du jeu"
        id="tags"
        hidden={hiddenOutside(STEP.infos)}
        class="col-span-full"
      >
        <div class="w-full">
          <TagPicker
            tags={data.tags}
            bind:selected={tags}
            invalid={Boolean(fieldState.errors.tags || errors.tags)}
          />
        </div>
      </GameField>

      <!-- Étape « Traduction » -->
      <GameField
        label="Nom de l'édition"
        id="editionName"
        hidden={hiddenOutside(STEP.translation)}
        help="Laissez vide pour l'édition de base. Exemple : Saison 1"
      >
        <input
          id="editionName"
          name="editionName"
          placeholder="Nom de l'édition"
          maxlength="255"
          class="{field} {tone('editionName')}"
          bind:value={game.editionName}
        >
      </GameField>

      <GameField
        label="Statut de progression"
        id="status"
        hidden={hiddenOutside(STEP.translation)}
      >
        <select
          id="status"
          name="status"
          class="{field} cursor-pointer {tone('status')}"
          bind:value={game.status}
        >
          {#each data.statuses as item (item.value)}
            <option value={item.value}>{item.label}</option>
          {/each}
        </select>
      </GameField>

      {#if data.canAddTranslation}
        <GameField
          label="Status de la traduction"
          id="type"
          hidden={hiddenOutside(STEP.translation)}
        >
          <select
            id="type"
            name="type"
            class="{field} cursor-pointer {tone('type')}"
            bind:value={game.type}
            onchange={changeType}
          >
            {#each data.types as item (item.value)}
              <option value={item.value}>{item.label}</option>
            {/each}
          </select>
        </GameField>

        <GameField
          label="Version de la traduction"
          id="translationVersion"
          hidden={hiddenOutside(STEP.translation)}
        >
          <input
            id="translationVersion"
            name="translationVersion"
            placeholder="Version de la traduction"
            maxlength={VERSION_MAX_LENGTH}
            class="{field} {tone('translationVersion')}"
            bind:value={game.translationVersion}
            disabled={!shape.versionRequired}
          >
          <button
            type="button"
            class="{iconButton} {game.editionVersion.trim() && shape.versionRequired ? '' : 'opacity-50'}"
            aria-label="Copier la version du jeu"
            title="Copier la version du jeu"
            disabled={!shape.versionRequired}
            onclick={() => (game.translationVersion = game.editionVersion.trim())}
          >
            <Copy size="16" />
          </button>
        </GameField>

        <GameField
          label="Lien de la traduction"
          id="translationLink"
          hidden={hiddenOutside(STEP.translation)}
        >
          <input
            id="translationLink"
            name="translationLink"
            type="text"
            placeholder="Lien de la traduction"
            class="{field} {tone('translationLink')}"
            bind:value={game.translationLink}
            disabled={shape.link !== 'required'}
          >
          {#if game.translationLink.trim() && shape.link === 'required'}
            <a
              href={game.translationLink.trim()}
              target="_blank"
              rel="noopener noreferrer"
              class={iconButton}
              aria-label="Ouvrir le lien de traduction"
            >
              <Link2 size="16" />
            </a>
          {:else}
            <span class="{iconButton} opacity-50" aria-hidden="true"
              ><Link2Off size="16" /></span
            >
          {/if}
        </GameField>

        <GameField
          label="Traducteur"
          id="translators"
          hidden={hiddenOutside(STEP.translation) || !shape.translators}
          help={data.staff
  ? "Vous pouvez ne pas être le traducteur et désigner d'autres personnes."
  : "Le compte qui crée la traduction en est le traducteur. Vous pouvez ajouter d'autres traducteurs."}
        >
          <div class="flex w-full flex-col gap-2">
            <input
              type="hidden"
              name="selfTranslator"
              value={selfTranslator || !data.staff ? 'on' : ''}
            >
            {#if selfTranslator || !data.staff}
              <span
                class="flex w-fit items-center gap-1 rounded-lg bg-primary px-2 py-0.5 text-xs font-bold text-neutral-content"
              >
                {data.self.name}
                (vous)
                {#if data.staff}
                  <button
                    type="button"
                    class="cursor-pointer"
                    aria-label="Je ne suis pas le traducteur"
                    onclick={() => (selfTranslator = false)}
                  >
                    ×
                  </button>
                {/if}
              </span>
            {:else}
              <button
                type="button"
                class="w-fit cursor-pointer text-xs underline"
                onclick={() => (selfTranslator = true)}
              >
                Je suis le traducteur ({data.self.name})
              </button>
            {/if}
            <UserPicker
              name="translators"
              bind:value={translators}
              canCreate={data.staff}
              placeholder={data.staff ? 'Rechercher un traducteur…' : 'Ajouter un autre traducteur…'}
              invalid={Boolean(fieldState.errors.translators || errors.translators)}
            />
          </div>
        </GameField>

        <GameField
          label="Relecteur"
          id="proofreaders"
          hidden={hiddenOutside(STEP.translation) || !shape.translators}
        >
          <div class="w-full">
            <UserPicker
              name="proofreaders"
              bind:value={proofreaders}
              canCreate={data.staff}
              placeholder="Rechercher un relecteur…"
              invalid={Boolean(errors.proofreaders)}
            />
          </div>
        </GameField>

        <GameField
          label="Type de Traduction"
          id="quality"
          hidden={hiddenOutside(STEP.translation)}
        >
          <select
            id="quality"
            name="quality"
            class="{field} cursor-pointer {tone('quality')}"
            bind:value={game.quality}
            disabled={shape.fixedQuality !== null}
          >
            {#each data.qualities as item (item.value)}
              <option value={item.value}>{item.label}</option>
            {/each}
          </select>
        </GameField>
      {:else}
        <p
          class="col-span-full text-sm opacity-70 {hiddenOutside(STEP.translation) ? 'hidden' : ''}"
        >
          Vous n'avez pas le droit d'ajouter une traduction : le jeu sera créé
          sans traduction.
        </p>
      {/if}

      <!-- Étape « Auto-check » (réservée à ceux qui ont le droit) -->
      {#if data.canManageAutoCheck && autoCheckAvailable}
        <GameField
          label="Auto-check jeu"
          id="autoCheck"
          hidden={hiddenOutside(STEP.autoCheck)}
          help="Mise à jour automatique des infos du jeu (version du jeu, description, image, tags)"
        >
          <input
            id="autoCheck"
            name="autoCheck"
            type="checkbox"
            class="size-7 cursor-pointer"
            bind:checked={game.autoCheck}
          >
        </GameField>

        <GameField
          label="Auto-check traduction"
          id="editionAutoCheck"
          hidden={hiddenOutside(STEP.autoCheck)}
          help="Mise à jour automatique des infos de la traduction (statut, version de référence)"
        >
          <input
            id="editionAutoCheck"
            name="editionAutoCheck"
            type="checkbox"
            class="size-7 cursor-pointer"
            bind:checked={game.editionAutoCheck}
            disabled={!game.autoCheck}
          >
        </GameField>
      {/if}
    </div>

    <div
      class="flex w-full flex-row flex-wrap items-center justify-between gap-3 rounded-xl bg-base-200/40 px-3 py-4 sm:px-4"
    >
      {#if step > 0}
        <Button
          label="Précédent"
          inline
          classes="w-full md:w-40"
          onclick={() => changeStep(-1)}
        />
      {/if}
      {#if step < maxStep}
        <Button
          label="Suivant"
          classes="w-full md:w-40 only:ml-auto"
          disabled={blockNextStep}
          title={duplicate
  ? 'Un jeu existe déjà avec ce thread : changez de thread ou consultez sa fiche'
  : blockNextStep
    ? 'ID du thread requis'
    : undefined}
          onclick={() => changeStep(1)}
        />
      {:else}
        <Button
          label={submitting ? 'Création…' : 'Ajouter le jeu'}
          type="submit"
          classes="w-full md:w-40"
          disabled={blockFinalSubmit || submitting}
          title={blockFinalSubmit
  ? "Corrigez les champs en erreur (rouge) avant d'envoyer — les avertissements (jaune) ne bloquent pas"
  : undefined}
        />
      {/if}
    </div>
  </form>
</div>
