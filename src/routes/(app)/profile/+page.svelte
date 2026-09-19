<script lang="ts">
import { ArrowDownAZ, ArrowUpAZ, ImageOff, PenOff } from '@lucide/svelte';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import { cn } from '$lib/utils/cn';

let editMode = $state(false);

const user = $state({
  name: 'Hunteraulo',
  image:
    'https://cdn.discordapp.com/avatars/521092563042828297/84a0e6cc5576d6395643c8d32e8a2c75.webp?size=256',
  rank: 'Super admin',
  banner: null,
  description: 'Salut les donateurs !',
});

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
  class="flex absolute left-0 top-16 gap-2 justify-center items-center p-1 w-full bg-base-300"
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
  <section class="flex flex-col items-center p-4 w-80 max-w-full">
    <div
      class="flex overflow-hidden relative justify-center items-center p-2 rounded-full bg-base-300 size-48"
    >
      {#if user.image}
        <img src={user.image} alt="Profil de {user.name}" class="rounded-full">
      {:else}
        <ImageOff size="64" opacity=".2" />
      {/if}

      {#if editMode}
        <button
          type="button"
          class="absolute opacity-0 hover:opacity-50 bg-neutral/50 h-full w-full rounded-lg cursor-pointer"
        >
          Changer l'image
        </button>
      {/if}
    </div>

    <h2 class="mt-4 font-bold">{user.name}</h2>
    <h3>{user.rank}</h3>
  </section>
  <section class="flex flex-col gap-4 w-full min-h-80">
    {#if user.banner || editMode}
      <div
        class="flex overflow-hidden relative justify-center items-center h-48 rounded-xl bg-base-300"
      >
        {#if user.banner}
          <img
            src={user.banner}
            alt="Bannière de profil de {user.name}"
            class="object-cover rounded-full"
          >
        {:else}
          <ImageOff size="64" opacity=".2" />
        {/if}

        {#if editMode}
          <button
            type="button"
            class="bottom-0 right-0 absolute bg-neutral/50 py-1 px-5 rounded-tl-lg cursor-pointer"
          >
            Changer la bannière
          </button>
        {/if}
      </div>
    {/if}

    {#if user.description || editMode}
      <div
        class="flex overflow-hidden relative items-center p-6 rounded-xl bg-base-300 min-h-48"
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
            class="bottom-0 right-0 absolute bg-neutral/50 py-1 px-5 rounded-tl-lg cursor-pointer"
          >
            Changer la description
          </button>
        {/if}
      </div>
    {/if}

    {#if items.length > 0}
      <div class="flex relative flex-col p-2 rounded-xl">
        <h3 class="py-4 text-xl font-bold text-center">Mes traductions:</h3>

        <div class="flex justify-end my-4">
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
                  <span class="flex gap-2 justify-center items-center">
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
                class="relative border-collapse even:bg-base-300 odd:bg-base-100"
              >
                <td class="py-2 px-4 font-bold">{item.name}</td>
                <td class="py-2 px-4 text-center">{item.version}</td>
                <td
                  class={cn('py-2 px-4 text-center', item.version !== item.tversion && 'text-yellow-500')}
                >
                  {item.tversion}
                </td>
                <td class="flex gap-2 justify-center py-3 px-4">
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
