<script lang="ts">
import { ArrowDownAZ, ArrowUpAZ, ImageOff, PenOff } from '@lucide/svelte';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import { cn } from '$lib/utils/cn';
import type { PageData } from './$types.js';

interface Props {
  data: PageData;
}

const { data }: Props = $props();

const user = $derived(data.profile);

let editMode = $state(false);

type SortKey = 'name' | 'version' | 'tversion';

const columns: { label: string; key: SortKey | null }[] = [
  { label: 'Nom', key: 'name' },
  { label: 'Version', key: 'version' },
  { label: 'Trad. Ver.', key: 'tversion' },
  { label: 'Actions', key: null },
];

const items = [
  {
    id: '1',
    name: 'Gloup',
    version: 'v1.2.0',
    tversion: 'v1.1.0',
    abandoned: false,
  },
  {
    id: '2',
    name: 'Shloupe',
    version: 'v0.4.0',
    tversion: 'v0.4.0',
    abandoned: false,
  },
  {
    id: '3',
    name: 'Scrounch',
    version: 'v2.8.2',
    tversion: 'v1.6.1',
    abandoned: false,
  },
  {
    id: '4',
    name: 'Wroup',
    version: 'v1.6.1',
    tversion: 'v1.6.1',
    abandoned: false,
  },
  {
    id: '5',
    name: 'Swoom',
    version: 'v4.5.8',
    tversion: 'v4.5.8',
    abandoned: false,
  },
  {
    id: '6',
    name: 'Slappy',
    version: 'v0.8.2',
    tversion: 'v0.6.1',
    abandoned: true,
  },
  {
    id: '7',
    name: 'Buyrp',
    version: 'v1.4.8',
    tversion: 'v0.9.6',
    abandoned: true,
  },
];

let search = $state('');
let sortKey = $state<SortKey | null>('name');
let sortAsc = $state(true);

function sortBy(key: SortKey | null) {
  if (!key) return;
  if (sortKey === key) {
    sortAsc = !sortAsc;
  } else {
    sortKey = key;
    sortAsc = true;
  }
}

const filteredItems = $derived.by(() => {
  const query = search.trim().toLowerCase();

  const filtered = query
    ? items.filter((item) => item.name.toLowerCase().includes(query))
    : items;

  return [...filtered].sort((a, b) => {
    if (!sortKey) return 0;

    const cmp = a[sortKey].localeCompare(b[sortKey]);
    return sortAsc ? cmp : -cmp;
  });
});
</script>

<div
  class="absolute top-16 left-0 flex w-full items-center justify-center gap-2 bg-base-300 p-1"
>
  {#if editMode}
    Si vous souhaiter arrêter le mode édition de profil. C'est juste ici
  {:else}
    Si vous souhaiter modifier votre profil, vous devez passer un mode édition
    de profil.
  {/if}
  <Button
    label={editMode ? 'Arrêter le mode édition' : 'Activer le mode édition'}
    size="tiny"
    onclick={() => (editMode = !editMode)}
  />
</div>

<div class="flex gap-2">
  <section class="flex w-80 max-w-full flex-col items-center p-4">
    <div
      class="relative flex size-48 items-center justify-center overflow-hidden rounded-full bg-base-300 p-2"
    >
      {#if user.avatar}
        <img src={user.avatar} alt="Profil de {user.name}" class="rounded-full">
      {:else}
        <ImageOff size="64" opacity=".2" />
      {/if}

      {#if editMode}
        <button
          type="button"
          class="absolute h-full w-full cursor-pointer rounded-lg bg-neutral/50 opacity-0 hover:opacity-50"
        >
          Changer l'image
        </button>
      {/if}
    </div>

    <h2 class="mt-4 font-bold">{user.name}</h2>
    <h3>{user.role.label}</h3>
  </section>
  <section class="flex min-h-80 w-full flex-col gap-4">
    {#if user.banner || editMode}
      <div
        class="relative flex h-48 items-center justify-center overflow-hidden rounded-xl bg-base-300"
      >
        {#if user.banner}
          <img
            src={user.banner}
            alt="Bannière de profil de {user.name}"
            class="rounded-full object-cover"
          >
        {:else}
          <ImageOff size="64" opacity=".2" />
        {/if}

        {#if editMode}
          <button
            type="button"
            class="absolute right-0 bottom-0 cursor-pointer rounded-tl-lg bg-neutral/50 px-5 py-1"
          >
            Changer la bannière
          </button>
        {/if}
      </div>
    {/if}

    {#if user.description || editMode}
      <div
        class="relative flex min-h-48 items-center overflow-hidden rounded-xl bg-base-300 p-6"
      >
        {#if user.description}
          <p class="self-start">
            {user.description}
          </p>
        {:else}
          <PenOff class="mx-auto" size="64" opacity=".2" />
        {/if}

        {#if editMode}
          <button
            type="button"
            class="absolute right-0 bottom-0 cursor-pointer rounded-tl-lg bg-neutral/50 px-5 py-1"
          >
            Changer la description
          </button>
        {/if}
      </div>
    {/if}

    {#if items.length > 0}
      <div class="relative flex flex-col rounded-xl p-2">
        <h3 class="py-4 text-center text-xl font-bold">Mes traductions:</h3>

        <div class="my-4 flex justify-end">
          <Input
            placeholder="Rechercher un nom..."
            value={search}
            oninput={(e) => (search = e.currentTarget.value)}
          />
        </div>

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
            {#each filteredItems as item (item.id)}
              <tr
                class="relative border-collapse odd:bg-base-100 even:bg-base-300"
              >
                <td class="px-4 py-2 font-bold">{item.name}</td>
                <td class="px-4 py-2 text-center">{item.version}</td>
                <td
                  class={cn('px-4 py-2 text-center', item.version !== item.tversion && 'text-yellow-500')}
                >
                  {item.tversion}
                </td>
                <td class="flex justify-center gap-2 px-4 py-3">
                  <Button label="Accèder" size="tiny" />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>
