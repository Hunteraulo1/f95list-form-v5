<script lang="ts">
import { untrack } from 'svelte';
import GameField from '#lib/components/games/GameField.svelte';
import TagPicker from '#lib/components/games/TagPicker.svelte';
import Button from '#lib/components/ui/Button.svelte';
import Modal from '#lib/components/ui/Modal.svelte';
import {
  DESCRIPTION_MAX_LENGTH,
  type FieldErrors,
  GAME_NAME_MAX_LENGTH,
  LINK_MAX_LENGTH,
  threadLink,
} from '#lib/games/game-form.ts';
import { IMAGE_HOSTS_LABEL } from '#lib/image-hosts.ts';
import { submitForm } from '#lib/utils/form.ts';
import { enhance } from '$app/forms';

export interface EditGameValues {
  name: string;
  originId: string;
  threadId: number | null;
  link: string;
  image: string | null;
  description: string | null;
  descriptionFr: string | null;
  autoCheck: boolean;
  tagIds: number[];
}

interface Origin {
  id: string;
  name: string;
  hasThread: boolean;
  autoCheck: boolean;
}

interface Props {
  //? Valeurs actuelles du jeu : la fenêtre part d'elles à chaque ouverture (elle n'est montée
  //? que le temps d'être ouverte).
  values: EditGameValues;
  origins: Origin[];
  tags: { id: number; name: string }[];
  hasInternalImage: boolean;
  canManageAutoCheck: boolean;
  onclose: () => void;
}

const {
  values,
  origins,
  tags,
  hasInternalImage,
  canManageAutoCheck,
  onclose,
}: Props = $props();

const FORM_ID = 'edit-game-form';

const game = $state(
  untrack(() => ({
    name: values.name,
    originId: values.originId,
    threadId: values.threadId?.toString() ?? '',
    link: values.link,
    image: values.image ?? '',
    description: values.description ?? '',
    descriptionFr: values.descriptionFr ?? '',
    autoCheck: values.autoCheck,
    tagIds: [...values.tagIds],
  })),
);

let submitting = $state(false);
//? Erreurs renvoyées par le serveur, par champ.
let errors = $state<FieldErrors>({});

const origin = $derived(origins.find(({ id }) => id === game.originId));
const hasThread = $derived(origin?.hasThread ?? false);
const threadId = $derived(
  /^\d+$/.test(game.threadId.trim()) ? Number(game.threadId) : null,
);
//? Site à thread : le lien se déduit du numéro, comme à la création.
const gameLink = $derived(
  hasThread && origin && threadId !== null
    ? (threadLink(origin.name, threadId) ?? '')
    : '',
);

const field =
  'shadow-mini h-9 w-full min-w-0 rounded-xl border-2 bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60';
const tone = (key: string) =>
  errors[key] ? 'border-error' : 'border-transparent';
</script>

<Modal
  open
  {onclose}
  size="big"
  title="Modifier le jeu"
  description="Informations du jeu « {values.name} ». Ses traductions se modifient depuis leur ligne."
>
  <form
    id={FORM_ID}
    method="POST"
    action="?/edit"
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
    <GameField label="Nom du jeu" id="edit-name" class="md:col-span-2">
      <input
        id="edit-name"
        name="name"
        placeholder="Nom du jeu"
        maxlength={GAME_NAME_MAX_LENGTH}
        required
        class="{field} {tone('name')}"
        bind:value={game.name}
      >
    </GameField>

    <GameField label="Plateforme" id="edit-originId">
      <select
        id="edit-originId"
        name="originId"
        class="{field} cursor-pointer {tone('originId')}"
        bind:value={game.originId}
      >
        {#each origins as item (item.id)}
          <option value={item.id}>{item.name}</option>
        {/each}
      </select>
    </GameField>

    {#if hasThread}
      <GameField
        label="ID du thread"
        id="edit-threadId"
        help={gameLink ? `Lien du jeu : ${gameLink}` : undefined}
      >
        <input
          id="edit-threadId"
          name="threadId"
          type="text"
          inputmode="numeric"
          placeholder="ID du thread"
          class="{field} {tone('threadId')}"
          bind:value={game.threadId}
        >
      </GameField>
    {:else}
      <GameField label="Lien du jeu" id="edit-link">
        <input
          id="edit-link"
          name="link"
          type="url"
          placeholder="Lien du jeu"
          maxlength={LINK_MAX_LENGTH}
          class="{field} {tone('link')}"
          bind:value={game.link}
        >
      </GameField>
    {/if}

    <GameField
      label="Lien de l'image du jeu"
      id="edit-image"
      class="md:col-span-2"
      help={hasInternalImage
        ? "Ce jeu affiche une image hébergée chez nous : changer ce lien ne change pas l'image affichée."
        : `Lien d'une image hébergée sur : ${IMAGE_HOSTS_LABEL}.`}
    >
      <input
        id="edit-image"
        name="image"
        type="url"
        placeholder="Lien de l'image"
        maxlength={LINK_MAX_LENGTH}
        class="{field} {tone('image')}"
        bind:value={game.image}
      >
    </GameField>

    <GameField label="Description" id="edit-description">
      <textarea
        id="edit-description"
        name="description"
        placeholder="Description du jeu"
        maxlength={DESCRIPTION_MAX_LENGTH}
        class="{field} h-32 min-h-10 resize-y py-2 {tone('description')}"
        bind:value={game.description}
      ></textarea>
    </GameField>

    <GameField
      label="Description française"
      id="edit-descriptionFr"
      help="Laissée vide, elle est traduite automatiquement depuis la description."
    >
      <textarea
        id="edit-descriptionFr"
        name="descriptionFr"
        placeholder="Description française"
        maxlength={DESCRIPTION_MAX_LENGTH}
        class="{field} h-32 min-h-10 resize-y py-2 {tone('descriptionFr')}"
        bind:value={game.descriptionFr}
      ></textarea>
    </GameField>

    <GameField label="Tags" id="edit-tags" class="md:col-span-2">
      <div class="w-full">
        <TagPicker
          {tags}
          bind:selected={game.tagIds}
          invalid={Boolean(errors.tags)}
        />
      </div>
    </GameField>

    {#if canManageAutoCheck && origin?.autoCheck}
      <GameField
        label="Auto-check jeu"
        id="edit-autoCheck"
        help="Mise à jour automatique des infos du jeu (version du jeu, description, image, tags)"
      >
        <input
          id="edit-autoCheck"
          name="autoCheck"
          type="checkbox"
          class="size-7 cursor-pointer"
          bind:checked={game.autoCheck}
        >
      </GameField>
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
