<script lang="ts">
import { ArrowDownAZ, ArrowUpAZ, KeyRound } from '@lucide/svelte';
import { enhance } from '$app/forms';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import { cn } from '$lib/utils/cn';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

type SortKey = 'owner' | 'name' | 'createdAt' | 'lastUsedAt';

const columns: { label: string; key: SortKey | null }[] = [
  { label: 'Propriétaire', key: 'owner' },
  { label: 'Nom', key: 'name' },
  { label: 'Clé', key: null },
  { label: 'Créée le', key: 'createdAt' },
  { label: 'Dernière utilisation', key: 'lastUsedAt' },
  { label: 'Requêtes du jour', key: null },
  { label: 'Actions', key: null },
];

let search = $state('');
let sortKey = $state<SortKey | null>('createdAt');
let sortAsc = $state(false);

function sortBy(key: SortKey | null) {
  if (!key) return;
  if (sortKey === key) {
    sortAsc = !sortAsc;
  } else {
    sortKey = key;
    sortAsc = true;
  }
}

//? Les dates sont des ISO 8601 : elles se trient correctement comme des chaînes.
const sortValue = (key: (typeof data.keys)[number], sort: SortKey) =>
  sort === 'owner' ? key.owner.name : (key[sort] ?? '');

const filteredKeys = $derived.by(() => {
  const query = search.trim().toLowerCase();

  const filtered = query
    ? data.keys.filter(
        (key) =>
          key.name.toLowerCase().includes(query) ||
          key.owner.name.toLowerCase().includes(query),
      )
    : data.keys;

  return [...filtered].sort((a, b) => {
    if (!sortKey) return 0;

    const cmp = sortValue(a, sortKey).localeCompare(sortValue(b, sortKey));
    return sortAsc ? cmp : -cmp;
  });
});

const error = $derived(form && 'error' in form ? form.error : null);

const numberField =
  'shadow-mini h-6 w-24 rounded-xl border-2 border-transparent bg-neutral-content px-2 text-center text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const formatDate = (iso: string) => dateFormat.format(new Date(iso));
</script>

<div class="relative flex flex-col rounded-xl p-2">
  <h3 class="py-4 text-center text-xl font-bold">Quotas par rôle:</h3>

  <table class="w-full table-fixed border-spacing-2">
    <thead>
      <tr>
        <th scope="col">Rôle</th>
        <th scope="col">Clés max. par utilisateur</th>
        <th scope="col">Requêtes / jour / clé</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each data.roles as role (role.id)}
        <tr class="odd:bg-base-100 even:bg-base-300">
          <td class="px-4 py-2 font-bold">{role.label}</td>
          <td class="px-4 py-2 text-center" colspan="3">
            <form
              method="POST"
              action="?/setRoleQuota"
              class="grid grid-cols-3 items-center"
              use:enhance={() =>
  async ({ update }) =>
    update({ reset: false })}
            >
              <input type="hidden" name="id" value={role.id}>
              <span>
                <input
                  class={numberField}
                  type="number"
                  name="apiKeyLimit"
                  min="0"
                  max={data.maxKeyLimit}
                  value={role.apiKeyLimit}
                  aria-label="Clés max. pour {role.label}"
                >
              </span>
              <span>
                <input
                  class={numberField}
                  type="number"
                  name="apiDailyQuota"
                  min="0"
                  max={data.maxDailyQuota}
                  value={role.apiDailyQuota}
                  aria-label="Requêtes par jour pour {role.label}"
                >
              </span>
              <span class="flex justify-center">
                <Button label="Enregistrer" type="submit" size="tiny" />
              </span>
            </form>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <h3 class="py-4 pt-8 text-center text-xl font-bold">Clés API:</h3>

  <div class="my-4 flex items-center justify-between gap-2">
    <span class="text-sm opacity-70">
      {data.keys.length}
      clé{data.keys.length > 1 ? 's' : ''}
      au total
    </span>
    <Input
      placeholder="Rechercher un nom ou un propriétaire..."
      classes="w-80"
      value={search}
      oninput={(e) => (search = e.currentTarget.value)}
    />
  </div>

  {#if error}
    <p class="pb-2 text-sm font-bold text-error">{error}</p>
  {/if}

  {#if data.keys.length === 0}
    <div class="flex flex-col items-center gap-2 py-8">
      <KeyRound size="64" opacity=".2" />
      <p class="text-sm opacity-60">Aucune clé API n'a été créée.</p>
    </div>
  {:else}
    <table class="w-full table-fixed border-spacing-2">
      <thead>
        <tr>
          {#each columns as { label, key }}
            <th
              scope="col"
              class={cn('select-none', key && 'cursor-pointer')}
              onclick={() => sortBy(key)}
            >
              <span class="flex items-center justify-center gap-2">
                {label}
                {#if key && sortKey === key}
                  {#if sortAsc}
                    <ArrowDownAZ size="16" />
                  {:else}
                    <ArrowUpAZ size="16" />
                  {/if}
                {/if}
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each filteredKeys as key (key.id)}
          <tr class="relative border-collapse odd:bg-base-100 even:bg-base-300">
            <td class="truncate px-4 py-2 font-bold">{key.owner.name}</td>
            <td class="truncate px-4 py-2 text-center">{key.name}</td>
            <td class="px-4 py-2 text-center font-mono text-sm">
              {key.prefix}…
            </td>
            <td class="px-4 py-2 text-center">{formatDate(key.createdAt)}</td>
            <td class="px-4 py-2 text-center">
              {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Jamais'}
            </td>
            <td
              class={cn('px-4 py-2 text-center', key.used >= key.quota && 'font-bold text-error')}
            >
              {key.used}
              / {key.quota}
              {#if key.customQuota !== null}
                <span class="block text-xs font-normal opacity-70">
                  quota personnalisé
                </span>
              {/if}
            </td>
            <td class="flex flex-col items-center gap-1 px-4 py-2">
              <form
                method="POST"
                action="?/setKeyQuota"
                class="flex items-center gap-1"
                use:enhance={() =>
  async ({ update }) =>
    update({ reset: false })}
              >
                <input type="hidden" name="id" value={key.id}>
                <input
                  class={numberField}
                  type="number"
                  name="quota"
                  min="0"
                  max={data.maxDailyQuota}
                  value={key.customQuota ?? ''}
                  placeholder="Quota du rôle"
                  aria-label="Quota personnalisé de {key.name}"
                >
                <Button label="Définir" type="submit" size="tiny" />
              </form>
              <form
                method="POST"
                action="?/revoke"
                class="flex justify-center"
                use:enhance={({ cancel }) => {
  if (
    !confirm(
      `Révoquer la clé « ${key.name} » de ${key.owner.name} ? Les applications qui l'utilisent perdront l'accès.`,
    )
  ) {
    cancel();
  }
}}
              >
                <input type="hidden" name="id" value={key.id}>
                <Button
                  label="Révoquer"
                  type="submit"
                  size="tiny"
                  classes="hover:bg-red-400 hover:text-white"
                />
              </form>
            </td>
          </tr>
        {:else}
          <tr>
            <td
              colspan={columns.length}
              class="px-4 py-6 text-center text-sm opacity-60"
            >
              Aucune clé ne correspond à la recherche.
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
