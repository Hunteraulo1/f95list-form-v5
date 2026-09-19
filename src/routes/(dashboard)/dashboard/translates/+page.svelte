<script lang="ts">
import { ArrowDownAZ, ArrowUpAZ } from '@lucide/svelte';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import { cn } from '$lib/utils/cn';

type SortKey = 'name' | 'version' | 'tversion';

const columns: { label: string; key: SortKey | null }[] = [
  { label: 'Nom', key: 'name' },
  { label: 'Version', key: 'version' },
  { label: 'Trad. Ver.', key: 'tversion' },
  { label: 'Actions', key: null },
];

const items = $state([
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
]);

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
    // Règle immuable : les traductions abandonnées sont toujours en dernier.
    if (a.abandoned !== b.abandoned) return a.abandoned ? 1 : -1;

    // Règle immuable : les traductions pas à jour passent toujours en premier.
    const aOutdated = a.version !== a.tversion;
    const bOutdated = b.version !== b.tversion;
    if (aOutdated !== bOutdated) return aOutdated ? -1 : 1;

    if (!sortKey) return 0;

    const cmp = a[sortKey].localeCompare(b[sortKey]);
    return sortAsc ? cmp : -cmp;
  });
});
</script>

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
        class={cn(
  'border-collapse even:bg-base-300 odd:bg-base-100 relative',
  item.version !== item.tversion &&
    'even:bg-yellow-500/60! odd:bg-yellow-500/70!',
  item.abandoned && 'even:bg-red-600/30! odd:bg-red-600/40!',
)}
      >
        <td class="py-2 px-4 font-bold">{item.name}</td>
        <td class="py-2 px-4 text-center">{item.version}</td>
        <td class="py-2 px-4 text-center">{item.tversion}</td>
        <td class="flex gap-2 justify-center py-3 px-4">
          <Button label="Accèder" size="tiny" />
          <Button
            label={item.abandoned ? 'Reprendre' : 'Abandoner'}
            size="tiny"
            classes={cn(
  item.abandoned
    ? 'bg-red-400 text-white'
    : 'hover:bg-red-400 hover:text-white',
)}
            onclick={() => (item.abandoned = !item.abandoned)}
          />
        </td>
      </tr>
    {/each}
  </tbody>
</table>
