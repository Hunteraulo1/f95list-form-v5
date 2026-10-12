<script lang="ts">
import { untrack } from 'svelte';
import GameField from '#lib/components/games/GameField.svelte';
import Button from '#lib/components/ui/Button.svelte';
import Modal from '#lib/components/ui/Modal.svelte';
import {
  EDITION_NAME_MAX_LENGTH,
  type EditionStatus,
  type FieldErrors,
  VERSION_MAX_LENGTH,
} from '#lib/games/game-form.ts';
import { submitForm } from '#lib/utils/form.ts';
import { enhance } from '$app/forms';

export interface EditEditionValues {
  name: string | null;
  version: string;
  status: EditionStatus;
  autoCheck: boolean;
}

interface Props {
  editionId: string;
  //? Ce que la fenêtre annonce modifier, par exemple « Édition de base ».
  label: string;
  //? Valeurs actuelles : la fenêtre part d'elles à chaque ouverture (elle n'est montée que le
  //? temps d'être ouverte).
  values: EditEditionValues;
  statuses: { value: EditionStatus; label: string }[];
  //? L'auto-check ne se règle que pour un jeu F95zone lui-même en auto-check, avec le droit de le faire.
  canManageAutoCheck: boolean;
  onclose: () => void;
}

const {
  editionId,
  label,
  values,
  statuses,
  canManageAutoCheck,
  onclose,
}: Props = $props();

const FORM_ID = 'edit-edition-form';

const edition = $state(
  untrack(() => ({
    name: values.name ?? '',
    version: values.version,
    status: values.status,
    autoCheck: values.autoCheck,
  })),
);

let submitting = $state(false);
//? Erreurs renvoyées par le serveur, par champ.
let errors = $state<FieldErrors>({});

const field =
  'shadow-mini h-9 w-full min-w-0 rounded-xl border-2 bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';
const tone = (key: string) =>
  errors[key] ? 'border-error' : 'border-transparent';
</script>

<Modal
  open
  {onclose}
  title="Modifier l'édition"
  description="Édition « {label} »."
>
  <form
    id={FORM_ID}
    method="POST"
    action="?/editEdition"
    class="flex flex-col gap-4 p-1"
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
    <input type="hidden" name="editionId" value={editionId}>

    <GameField
      label="Nom de l'édition"
      id="edit-editionName"
      help="Exemple : Saison 2. Vide pour l'édition de base. Deux éditions d'un jeu ne portent pas le même nom."
    >
      <input
        id="edit-editionName"
        name="editionName"
        placeholder="Nom de l'édition"
        maxlength={EDITION_NAME_MAX_LENGTH}
        class="{field} {tone('editionName')}"
        bind:value={edition.name}
      >
    </GameField>

    <GameField label="Version du jeu" id="edit-editionVersion">
      <input
        id="edit-editionVersion"
        name="editionVersion"
        placeholder="Version du jeu"
        maxlength={VERSION_MAX_LENGTH}
        class="{field} {tone('editionVersion')}"
        bind:value={edition.version}
      >
    </GameField>

    <GameField label="Statut de progression" id="edit-editionStatus">
      <select
        id="edit-editionStatus"
        name="status"
        class="{field} cursor-pointer {tone('status')}"
        bind:value={edition.status}
      >
        {#each statuses as item (item.value)}
          <option value={item.value}>{item.label}</option>
        {/each}
      </select>
    </GameField>

    {#if canManageAutoCheck}
      <GameField
        label="Auto-check traduction"
        id="edit-editionAutoCheck"
        help="Mise à jour automatique des infos de l'édition (statut, version de référence). Activé, la version et le statut saisis ici seront remplacés à la prochaine vérification."
      >
        <input
          id="edit-editionAutoCheck"
          name="editionAutoCheck"
          type="checkbox"
          class="size-7 cursor-pointer"
          bind:checked={edition.autoCheck}
        >
      </GameField>
    {/if}

    {#if Object.keys(errors).length > 0}
      <ul class="text-sm font-bold text-error" role="alert">
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
