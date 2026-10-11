<script lang="ts">
import { Copy, Link2, Link2Off } from '@lucide/svelte';
import { tick, untrack } from 'svelte';
import GameField from '#lib/components/games/GameField.svelte';
import UserPicker, {
  type PickedUser,
} from '#lib/components/games/UserPicker.svelte';
import WizardSteps from '#lib/components/games/WizardSteps.svelte';
import Button from '#lib/components/ui/Button.svelte';
import {
  EDITION_NAME_MAX_LENGTH,
  type TranslationQuality,
  type TranslationType,
  translationFieldErrors,
  translationShape,
  VERSION_MAX_LENGTH,
} from '#lib/games/game-form.ts';
import { enhance } from '$app/forms';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

//? Même assistant que « Ajouter un jeu » : Édition → Traduction → Validation. Chaque champ reste
//? dans le formulaire (simplement masqué hors de son étape), donc l'envoi contient tout.
const STEP = { edition: 0, translation: 1, review: 2 } as const;
const stepLabels = ['Édition', 'Traduction', 'Validation'];
const maxStep = stepLabels.length - 1;

const translation = $state({
  //? Une seule édition : c'est elle par défaut ; sinon à choisir.
  editionId: untrack(() =>
    data.editions.length === 1 ? data.editions[0].id : '',
  ),
  editionName: '',
  editionVersion: '',
  status: 'in_progress',
  editionAutoCheck: false,
  type: 'translation' as TranslationType,
  quality: 'automatic' as TranslationQuality,
  version: '',
  link: '',
});
let translators = $state<PickedUser[]>([]);
let proofreaders = $state<PickedUser[]>([]);
let selfTranslator = $state(true);
let step = $state<number>(STEP.edition);
let submitting = $state(false);

const isNewEdition = $derived(translation.editionId === data.newEdition);
const edition = $derived(
  data.editions.find(({ id }) => id === translation.editionId),
);
//? Version du jeu à laquelle se rapporte la traduction : celle de l'édition choisie ou saisie.
const editionVersion = $derived(
  (isNewEdition ? translation.editionVersion : (edition?.version ?? '')).trim(),
);
const shape = $derived(translationShape(translation.type));
//? Soi-même est imposé comme traducteur aux non-staff, sauf quand les traducteurs sont facultatifs.
const selfLocked = $derived(!data.staff && shape.translators === 'required');

const fieldErrors = $derived.by(() => {
  const errors: Record<string, boolean> = translationFieldErrors({
    type: translation.type,
    translationVersion: translation.version,
    translationLink: translation.link,
    translatorCount:
      (selfTranslator || selfLocked ? 1 : 0) + translators.length,
  });

  if (!isNewEdition && !edition) errors.editionId = true;
  if (isNewEdition) {
    const version = translation.editionVersion.trim();
    if (!version || version.length > VERSION_MAX_LENGTH) {
      errors.editionVersion = true;
    }
  }

  return errors;
});
const editionKeys = ['editionId', 'editionName', 'editionVersion', 'status'];
const blockNextStep = $derived(
  step === STEP.edition && editionKeys.some((key) => fieldErrors[key]),
);
const blockFinalSubmit = $derived(Object.keys(fieldErrors).length > 0);

const errors = $derived<Record<string, string>>(form?.errors ?? {});
const errorEntries = $derived(Object.entries(errors));

//? Un champ appartient à une étape ; l'étape de validation les montre tous.
const hiddenOutside = (...steps: number[]) =>
  !steps.includes(step) && step !== STEP.review;

const field =
  'shadow-mini h-9 w-full min-w-0 rounded-xl border-2 bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60';
const tone = (key: string) =>
  fieldErrors[key] || errors[key] ? 'border-error' : 'border-transparent';
const iconButton =
  'shadow-mini mt-0 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-transparent bg-primary text-neutral-content';

//? Le type de traduction fige certains champs, comme à l'ajout d'un jeu.
const changeType = () => {
  //? Une traduction intégrée n'a de traducteur que s'il travaille avec le développeur : par
  //? défaut personne, pas même soi.
  selfTranslator = shape.translators === 'required';
  if (translation.type === 'integrated') {
    translation.version = shape.fixedVersion;
    translation.link = '';
  } else if (
    translation.version === translationShape('integrated').fixedVersion
  ) {
    translation.version = '';
  }
};

const changeStep = (amount: number) => {
  step = Math.min(Math.max(step + amount, 0), maxStep);
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
  changeStep(1);
};

//? Les erreurs du serveur ramènent à l'étape du premier champ fautif.
const goToFirstError = async () => {
  const keys = Object.keys(form?.errors ?? {});
  if (keys.length === 0) return;

  step = keys.some((key) => editionKeys.includes(key))
    ? STEP.edition
    : STEP.translation;
  await tick();
  document.querySelector('[data-error]')?.scrollIntoView({ block: 'center' });
};
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-1 sm:px-4">
  <div class="rounded-xl bg-base-100 p-4 sm:p-6">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <h1 class="text-xl font-bold sm:text-2xl">Ajouter une traduction</h1>
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
        if (!blockNextStep) changeStep(1);
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
          Corrigez les champs signalés avant d'ajouter la traduction :
        </p>
        <ul class="mt-1 list-inside list-disc">
          {#each errorEntries as [key, message] (key)}
            <li>{message}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div
      class="flex min-h-11 items-center gap-3 rounded-xl bg-base-200/60 px-4 py-3 text-sm"
    >
      <span>
        <span class="font-bold">Section active :</span>
        {stepLabels[step]}
      </span>
    </div>

    <div class="rounded-xl bg-base-200/60 px-4 py-3 text-sm">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-bold">Jeu concerné</span>
        <a class="text-xs underline" href="/games/{data.game.id}">
          Voir la fiche du jeu
        </a>
      </div>
      <div
        class="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4"
      >
        {#each [
          ['Nom', data.game.name],
          ['Site', data.game.origin],
          [
            'Édition',
            isNewEdition
              ? translation.editionName.trim() || 'Nouvelle édition'
              : (edition?.name ?? '—'),
          ],
          ['Version du jeu', editionVersion || '—'],
        ] as [title, value] (title)}
          <div class="rounded-xl bg-base-100 px-3 py-2">
            <p class="opacity-60">{title}</p>
            <p class="truncate font-bold">{value}</p>
          </div>
        {/each}
      </div>
    </div>

    {#if edition && edition.translations.length > 0}
      <div class="flex flex-col gap-2 rounded-xl bg-warning/20 p-3 text-sm">
        <p class="text-xs font-bold opacity-80">
          Traductions déjà enregistrées pour cette édition :
        </p>
        <ul class="flex flex-col gap-1">
          {#each edition.translations as existing (existing.id)}
            <li class="rounded-lg bg-warning/20 px-2 py-1 text-xs">
              {existing.type}{existing.version ? ` (${existing.version})` : ''}
            </li>
          {/each}
        </ul>
        <p class="text-xs opacity-70">
          Pour mettre à jour l'une d'elles, modifiez-la depuis la fiche du jeu
          plutôt que d'en ajouter une nouvelle.
        </p>
      </div>
    {/if}

    <div
      class="grid w-full grid-cols-1 gap-5 rounded-xl border-2 border-base-300 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      <!-- Étape « Édition » -->
      <GameField
        label="Édition du jeu"
        id="editionId"
        hidden={hiddenOutside(STEP.edition)}
        help="Une édition est une variante du jeu qui a sa propre version : saison, chapitre, remake…"
      >
        <select
          id="editionId"
          name="editionId"
          class="{field} cursor-pointer {tone('editionId')}"
          bind:value={translation.editionId}
        >
          <option value="" disabled>Choisir une édition…</option>
          {#each data.editions as item (item.id)}
            <option value={item.id}>{item.name} — {item.version}</option>
          {/each}
          <option value={data.newEdition}>Nouvelle édition…</option>
        </select>
      </GameField>

      {#if isNewEdition}
        <GameField
          label="Nom de l'édition"
          id="editionName"
          hidden={hiddenOutside(STEP.edition)}
          help="Exemple : Saison 2. Deux éditions d'un jeu ne portent pas le même nom."
        >
          <input
            id="editionName"
            name="editionName"
            placeholder="Nom de l'édition"
            maxlength={EDITION_NAME_MAX_LENGTH}
            class="{field} {tone('editionName')}"
            bind:value={translation.editionName}
          >
        </GameField>

        <GameField
          label="Version du jeu"
          id="editionVersion"
          hidden={hiddenOutside(STEP.edition)}
        >
          <input
            id="editionVersion"
            name="editionVersion"
            placeholder="Version du jeu"
            maxlength={VERSION_MAX_LENGTH}
            class="{field} {tone('editionVersion')}"
            bind:value={translation.editionVersion}
          >
        </GameField>

        <GameField
          label="Statut de progression"
          id="status"
          hidden={hiddenOutside(STEP.edition)}
        >
          <select
            id="status"
            name="status"
            class="{field} cursor-pointer {tone('status')}"
            bind:value={translation.status}
          >
            {#each data.statuses as item (item.value)}
              <option value={item.value}>{item.label}</option>
            {/each}
          </select>
        </GameField>

        {#if data.editionAutoCheck}
          <GameField
            label="Auto-check traduction"
            id="editionAutoCheck"
            hidden={hiddenOutside(STEP.edition)}
            help="Mise à jour automatique des infos de la traduction (statut, version de référence)"
          >
            <input
              id="editionAutoCheck"
              name="editionAutoCheck"
              type="checkbox"
              class="size-7 cursor-pointer"
              bind:checked={translation.editionAutoCheck}
            >
          </GameField>
        {/if}
      {:else if edition}
        <GameField
          label="Version du jeu"
          id="editionVersionShown"
          hidden={hiddenOutside(STEP.edition)}
        >
          <input
            id="editionVersionShown"
            class="{field} border-transparent"
            value={edition.version}
            disabled
          >
        </GameField>

        <GameField
          label="Statut de progression"
          id="statusShown"
          hidden={hiddenOutside(STEP.edition)}
        >
          <input
            id="statusShown"
            class="{field} border-transparent"
            value={edition.status}
            disabled
          >
        </GameField>
      {/if}

      <!-- Étape « Traduction » -->
      <GameField
        label="Status de la traduction"
        id="type"
        hidden={hiddenOutside(STEP.translation)}
      >
        <select
          id="type"
          name="type"
          class="{field} cursor-pointer {tone('type')}"
          bind:value={translation.type}
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
          bind:value={translation.version}
          disabled={!shape.versionRequired}
        >
        <button
          type="button"
          class="{iconButton} {editionVersion && shape.versionRequired
            ? ''
            : 'opacity-50'}"
          aria-label="Copier la version du jeu"
          title="Copier la version du jeu"
          disabled={!shape.versionRequired}
          onclick={() => (translation.version = editionVersion)}
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
          bind:value={translation.link}
          disabled={shape.link === 'none'}
        >
        {#if translation.link.trim() && shape.link !== 'none'}
          <a
            href={translation.link.trim()}
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
        hidden={hiddenOutside(STEP.translation) || shape.translators === 'none'}
        help={shape.translators === 'optional'
          ? 'Facultatif pour une traduction intégrée : seulement si le traducteur travaille avec le développeur du jeu.'
          : data.staff
            ? "Vous pouvez ne pas être le traducteur et désigner d'autres personnes."
            : "Le compte qui ajoute la traduction en est le traducteur. Vous pouvez ajouter d'autres traducteurs."}
      >
        <div class="flex w-full flex-col gap-2">
          <input
            type="hidden"
            name="selfTranslator"
            value={selfTranslator || selfLocked ? 'on' : ''}
          >
          {#if selfTranslator || selfLocked}
            <span
              class="flex w-fit items-center gap-1 rounded-lg bg-primary px-2 py-0.5 text-xs font-bold text-neutral-content"
            >
              {data.self.name}
              (vous)
              {#if !selfLocked}
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
            placeholder={data.staff
              ? 'Rechercher un traducteur…'
              : 'Ajouter un autre traducteur…'}
            invalid={Boolean(fieldErrors.translators || errors.translators)}
          />
        </div>
      </GameField>

      <GameField
        label="Relecteur"
        id="proofreaders"
        hidden={hiddenOutside(STEP.translation) || shape.translators === 'none'}
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
          bind:value={translation.quality}
          disabled={shape.fixedQuality !== null}
        >
          {#each data.qualities as item (item.value)}
            <option value={item.value}>{item.label}</option>
          {/each}
        </select>
      </GameField>
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
          title={blockNextStep
            ? "Choisissez l'édition (et sa version si elle est nouvelle)"
            : undefined}
          onclick={() => changeStep(1)}
        />
      {:else}
        <Button
          label={submitting ? 'Ajout…' : 'Ajouter la traduction'}
          type="submit"
          classes="w-full md:w-56"
          disabled={blockFinalSubmit || submitting}
          title={blockFinalSubmit
            ? "Corrigez les champs en erreur (rouge) avant d'envoyer"
            : undefined}
        />
      {/if}
    </div>
  </form>
</div>
