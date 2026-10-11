<script lang="ts">
import { Copy } from '@lucide/svelte';
import { untrack } from 'svelte';
import GameField from '#lib/components/games/GameField.svelte';
import UserPicker, {
  type PickedUser,
} from '#lib/components/games/UserPicker.svelte';
import Button from '#lib/components/ui/Button.svelte';
import Modal from '#lib/components/ui/Modal.svelte';
import {
  type FieldErrors,
  LINK_MAX_LENGTH,
  type TranslationQuality,
  type TranslationType,
  translationShape,
  userRef,
  VERSION_MAX_LENGTH,
} from '#lib/games/game-form.ts';
import { submitForm } from '#lib/utils/form.ts';
import { enhance } from '$app/forms';

export interface EditTranslationValues {
  type: TranslationType;
  quality: TranslationQuality;
  version: string;
  link: string | null;
  //? Sans soi-même ni les crédits anonymes des autres (voir `selfRole` et `hiddenCredits`).
  translators: PickedUser[];
  proofreaders: PickedUser[];
  selfRole: 'translator' | 'proofreader' | null;
  hiddenCredits: number;
}

interface Props {
  translationId: string;
  //? Ce que la fenêtre annonce modifier, par exemple « Édition de base — v1.0 ».
  label: string;
  //? Version du jeu, proposée d'un clic comme version de la traduction.
  editionVersion: string;
  //? Valeurs actuelles : la fenêtre part d'elles à chaque ouverture (elle n'est montée que le
  //? temps d'être ouverte).
  values: EditTranslationValues;
  types: { value: TranslationType; label: string }[];
  qualities: { value: TranslationQuality; label: string }[];
  //? Le staff peut ne pas être le traducteur et créer des comptes fantômes.
  staff: boolean;
  self: { id: string; name: string };
  onclose: () => void;
}

const {
  translationId,
  label,
  editionVersion,
  values,
  types,
  qualities,
  staff,
  self,
  onclose,
}: Props = $props();

const FORM_ID = 'edit-translation-form';

const translation = $state(
  untrack(() => ({
    type: values.type,
    quality: values.quality,
    version: values.version,
    link: values.link ?? '',
  })),
);
let translators = $state(untrack(() => [...values.translators]));
let proofreaders = $state(
  untrack(() => [
    ...(values.selfRole === 'proofreader'
      ? [{ ref: userRef(self.id), label: self.name }]
      : []),
    ...values.proofreaders,
  ]),
);
let selfTranslator = $state(untrack(() => values.selfRole === 'translator'));

let submitting = $state(false);
//? Erreurs renvoyées par le serveur, par champ.
let errors = $state<FieldErrors>({});

const shape = $derived(translationShape(translation.type));
//? Soi-même est imposé comme traducteur aux non-staff, sauf quand les traducteurs sont facultatifs.
const selfLocked = $derived(!staff && shape.translators === 'required');

//? Un type impose parfois la version, la qualité, ou l'absence de lien (voir `translationShape`).
const changeType = () => {
  if (!shape.versionRequired) translation.version = shape.fixedVersion;
  if (shape.fixedQuality) translation.quality = shape.fixedQuality;
  if (shape.link === 'none') translation.link = '';
};

const field =
  'shadow-mini h-9 w-full min-w-0 rounded-xl border-2 bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60';
const tone = (key: string) =>
  errors[key] ? 'border-error' : 'border-transparent';
const iconButton =
  'shadow-mini inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-transparent bg-primary text-neutral-content disabled:cursor-not-allowed disabled:opacity-50';
</script>

<Modal
  open
  {onclose}
  size="big"
  title="Modifier la traduction"
  description="Traduction « {label} »."
>
  <form
    id={FORM_ID}
    method="POST"
    action="?/editTranslation"
    class="grid grid-cols-1 gap-4 p-1 md:grid-cols-2"
    use:enhance={() => {
      submitting = true;
      return async ({ result, update }) => {
        await update({ reset: false });
        submitting = false;

        if (result.type === 'success') onclose();
        else if (result.type === 'failure') {
          errors = (result.data?.errors as FieldErrors | undefined) ?? {};
        }
      };
    }}
  >
    <input type="hidden" name="translationId" value={translationId}>

    <GameField label="Status de la traduction" id="edit-type">
      <select
        id="edit-type"
        name="type"
        class="{field} cursor-pointer {tone('type')}"
        bind:value={translation.type}
        onchange={changeType}
      >
        {#each types as item (item.value)}
          <option value={item.value}>{item.label}</option>
        {/each}
      </select>
    </GameField>

    <GameField label="Type de Traduction" id="edit-quality">
      <select
        id="edit-quality"
        name="quality"
        class="{field} cursor-pointer {tone('quality')}"
        bind:value={translation.quality}
        disabled={shape.fixedQuality !== null}
      >
        {#each qualities as item (item.value)}
          <option value={item.value}>{item.label}</option>
        {/each}
      </select>
    </GameField>

    <GameField
      label="Version de la traduction"
      id="edit-translationVersion"
      help="Version du jeu : {editionVersion}"
    >
      <input
        id="edit-translationVersion"
        name="translationVersion"
        placeholder="Version de la traduction"
        maxlength={VERSION_MAX_LENGTH}
        class="{field} {tone('translationVersion')}"
        bind:value={translation.version}
        disabled={!shape.versionRequired}
      >
      <button
        type="button"
        class={iconButton}
        aria-label="Copier la version du jeu"
        title="Copier la version du jeu ({editionVersion})"
        disabled={!shape.versionRequired}
        onclick={() => (translation.version = editionVersion.trim())}
      >
        <Copy size="16" />
      </button>
    </GameField>

    <GameField label="Lien de la traduction" id="edit-translationLink">
      <input
        id="edit-translationLink"
        name="translationLink"
        type="url"
        placeholder="Lien de la traduction"
        maxlength={LINK_MAX_LENGTH}
        class="{field} {tone('translationLink')}"
        bind:value={translation.link}
        disabled={shape.link === 'none'}
      >
    </GameField>

    {#if shape.translators !== 'none'}
      <GameField
        label="Traducteur"
        id="edit-translators"
        help={shape.translators === 'optional'
          ? 'Facultatif pour une traduction intégrée : seulement si le traducteur travaille avec le développeur du jeu.'
          : staff
            ? "Vous pouvez ne pas être le traducteur et désigner d'autres personnes."
            : 'Vous restez traducteur de cette traduction. Vous pouvez ajouter ou retirer les autres.'}
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
              {self.name}
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
              Je suis le traducteur ({self.name})
            </button>
          {/if}
          <UserPicker
            name="translators"
            bind:value={translators}
            canCreate={staff}
            placeholder="Rechercher un traducteur…"
            invalid={Boolean(errors.translators)}
          />
        </div>
      </GameField>

      <GameField label="Relecteur" id="edit-proofreaders">
        <div class="w-full">
          <UserPicker
            name="proofreaders"
            bind:value={proofreaders}
            canCreate={staff}
            placeholder="Rechercher un relecteur…"
            invalid={Boolean(errors.proofreaders)}
          />
        </div>
      </GameField>

      {#if values.hiddenCredits > 0}
        <p class="text-xs opacity-70 md:col-span-2">
          {values.hiddenCredits === 1
            ? 'Un crédit anonyme est conservé tel quel.'
            : `${values.hiddenCredits} crédits anonymes sont conservés tels quels.`}
        </p>
      {/if}
    {:else if values.translators.length +
      values.proofreaders.length +
      values.hiddenCredits >
      0 || values.selfRole}
      <p class="text-sm font-bold text-warning md:col-span-2">
        Ce type n'a pas de traducteur : les crédits actuels seront retirés à
        l'enregistrement.
      </p>
    {/if}

    {#if Object.keys(errors).length > 0}
      <ul class="text-sm font-bold text-error md:col-span-2" role="alert">
        {#each Object.entries(errors) as [key, message] (key)}
          <li>{message}</li>
        {/each}
      </ul>
    {/if}
  </form>

  {#snippet footer()}
    <Button label="Annuler" inline onclick={onclose} />
    <Button
      label={submitting ? 'Envoi…' : 'Enregistrer'}
      disabled={submitting}
      onclick={() => submitForm(FORM_ID)}
    />
  {/snippet}
</Modal>
