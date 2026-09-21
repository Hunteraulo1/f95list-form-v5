<script lang="ts">
import { Tags } from '@lucide/svelte';
import { enhance } from '$app/forms';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

type Filter = 'pending' | 'linked' | 'none' | 'all';

//? À classer : ni lié, ni gardé sans équivalent. Lié : renseigne `game.tags_f95`. Sans équivalent : gardé
//? tel quel, absent de `game.tags_f95`.
const stateOf = (tag: (typeof data.tags)[number]): Exclude<Filter, 'all'> =>
  tag.linkedTo !== null ? 'linked' : tag.active ? 'none' : 'pending';

const filters: { key: Filter; label: string }[] = [
  { key: 'pending', label: 'À classer' },
  { key: 'linked', label: 'Liés' },
  { key: 'none', label: 'Sans équivalent' },
  { key: 'all', label: 'Tous' },
];

let filter = $state<Filter>('pending');
let search = $state('');
let fetching = $state(false);

const counts = $derived({
  pending: data.tags.filter((tag) => stateOf(tag) === 'pending').length,
  linked: data.tags.filter((tag) => stateOf(tag) === 'linked').length,
  none: data.tags.filter((tag) => stateOf(tag) === 'none').length,
  all: data.tags.length,
});

const suggestionCount = $derived(
  data.tags.filter((tag) => tag.linkedTo === null && tag.suggestion !== null)
    .length,
);

const filteredTags = $derived.by(() => {
  const query = search.trim().toLowerCase();

  return data.tags.filter((tag) => {
    if (filter !== 'all' && stateOf(tag) !== filter) return false;
    return !query || tag.name.toLowerCase().includes(query);
  });
});

const targetName = (id: number | null) =>
  data.targets.find((target) => target.id === id)?.name;

const error = $derived(form && 'error' in form ? form.error : null);
const message = $derived(form && 'message' in form ? form.message : null);

const selectField =
  'shadow-mini h-8 w-56 rounded-xl border-2 border-transparent bg-neutral-content px-2 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';
</script>

<div class="relative flex flex-col rounded-xl p-2">
  <h3 class="py-4 text-center text-xl font-bold">Classement des tags:</h3>

  <p class="pb-2 text-center text-sm opacity-70">
    Lie chaque tag à un tag de F95zone : il garde ses jeux, et le tag F95zone
    s'ajoute à leurs tags filtrés. Sinon, garde-le sans équivalent.
  </p>

  <div class="my-4 flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-2">
      {#each filters as { key, label }}
        <Button
          label="{label} ({counts[key]})"
          size="small"
          inline={filter !== key}
          onclick={() => (filter = key)}
        />
      {/each}
    </div>

    <div class="flex items-center gap-2">
      <form
        method="POST"
        action="?/fetchF95zone"
        use:enhance={() => {
  fetching = true;
  return async ({ update }) => {
    await update();
    fetching = false;
  };
}}
      >
        <Button
          label={fetching ? 'Récupération…' : 'Récupérer les tags de F95zone'}
          type="submit"
          size="small"
          disabled={fetching}
        />
      </form>
      <form
        method="POST"
        action="?/applySuggestions"
        use:enhance={({ cancel }) => {
  if (
    !confirm(
      `Lier ${suggestionCount} tag${suggestionCount > 1 ? 's' : ''} selon les suggestions du dictionnaire ?`,
    )
  ) {
    cancel();
  }
}}
      >
        <Button
          label="Appliquer les suggestions ({suggestionCount})"
          type="submit"
          size="small"
          disabled={suggestionCount === 0}
          title={suggestionCount === 0 ? 'Aucun tag ne correspond au dictionnaire.' : undefined}
        />
      </form>
      <Input
        placeholder="Rechercher un tag..."
        classes="w-64"
        value={search}
        oninput={(e) => (search = e.currentTarget.value)}
      />
    </div>
  </div>

  {#if error}
    <p class="pb-2 text-sm font-bold text-error">{error}</p>
  {:else if message}
    <p class="pb-2 text-sm font-bold text-success">{message}</p>
  {/if}

  {#if data.tags.length === 0}
    <div class="flex flex-col items-center gap-2 py-8">
      <Tags size="64" opacity=".2" />
      <p class="text-sm opacity-60">Tous les tags sont ceux de F95zone.</p>
    </div>
  {:else}
    <table class="w-full table-fixed border-spacing-2">
      <thead>
        <tr>
          <th scope="col">Tag</th>
          <th scope="col" class="w-24">Jeux</th>
          <th scope="col">Lien vers un tag de F95zone</th>
          <th scope="col" class="w-56">Sinon</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredTags as tag (tag.id)}
          {@const status = stateOf(tag)}
          <tr class="relative border-collapse odd:bg-base-100 even:bg-base-300">
            <td class="px-4 py-2 font-bold">
              <span class="block truncate">{tag.name}</span>
              {#if status === 'pending'}
                <span class="block text-xs font-normal opacity-70">
                  À classer
                </span>
              {:else if status === 'none'}
                <span class="block text-xs font-normal opacity-70">
                  {tag.noEquivalent ? 'Sans équivalent chez F95zone' : 'Gardé sans équivalent'}
                </span>
              {/if}
            </td>
            <td class="px-4 py-2 text-center">{tag.games}</td>
            <td class="px-4 py-2">
              <form
                method="POST"
                action="?/link"
                class="flex items-center justify-center gap-1"
                use:enhance={() =>
  async ({ update }) =>
    update({ reset: false })}
              >
                <input type="hidden" name="id" value={tag.id}>
                <select
                  class={selectField}
                  name="targetId"
                  required
                  aria-label="Tag de F95zone pour {tag.name}"
                >
                  <option value="">Choisir un tag…</option>
                  {#each data.targets as target (target.id)}
                    <option
                      value={target.id}
                      selected={target.id === (tag.linkedTo ?? tag.suggestion)}
                    >
                      {target.name}
                    </option>
                  {/each}
                </select>
                <Button
                  label={status === 'linked' ? 'Changer' : 'Lier'}
                  type="submit"
                  size="tiny"
                />
              </form>
              {#if status === 'linked'}
                <form
                  method="POST"
                  action="?/link"
                  class="flex justify-center pt-1"
                  use:enhance
                >
                  <input type="hidden" name="id" value={tag.id}>
                  <input type="hidden" name="unlink" value="1">
                  <Button
                    label="Retirer le lien"
                    type="submit"
                    size="tiny"
                    classes="hover:bg-red-400 hover:text-white"
                  />
                </form>
              {:else if tag.suggestion !== null}
                <span class="block pt-1 text-center text-xs opacity-70">
                  Suggestion : {targetName(tag.suggestion)}
                </span>
              {/if}
            </td>
            <td class="px-4 py-2">
              {#if status !== 'linked'}
                <form
                  method="POST"
                  action="?/setActive"
                  class="flex justify-center"
                  use:enhance
                >
                  <input type="hidden" name="id" value={tag.id}>
                  <input
                    type="hidden"
                    name="active"
                    value={String(status === 'pending')}
                  >
                  <Button
                    label={status === 'pending' ? 'Garder sans équivalent' : 'Remettre à classer'}
                    type="submit"
                    size="tiny"
                  />
                </form>
              {/if}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="px-4 py-6 text-center text-sm opacity-60">
              Aucun tag dans cette catégorie.
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
