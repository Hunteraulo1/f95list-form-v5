<script lang="ts">
import { Funnel, X } from '@lucide/svelte';
import { untrack } from 'svelte';
import GamesFilterGroup from '$lib/components/ui/games/GamesFilterGroup.svelte';
import Input from '$lib/components/ui/Input.svelte';
import {
  createGamesFilterGroups,
  type GamesFilterGroupState,
  gameMatchesFilters,
  gameMatchesQuery,
  hasActiveGamesFilters,
  toggleGamesFilterValue,
} from '$lib/games/games-filter';
import { cn } from '$lib/utils/cn.js';
import type { PageData } from './$types';

interface Props {
  data: PageData;
}
const { data }: Props = $props();

let isOpen = $state(false);
let query = $state('');
//? Snapshot volontaire au montage : filterGroups reste mutable localement et ne doit
//? pas se resynchroniser si `data` change (voir untrack).
let filterGroups = $state<GamesFilterGroupState[]>(
  untrack(() => createGamesFilterGroups(data.filterOptions)),
);

const filteredGames = $derived(
  data.games
    .filter((game) => gameMatchesQuery(game, query))
    .filter((game) => gameMatchesFilters(game, filterGroups)),
);
const hasFilters = $derived(
  Boolean(query.trim()) || hasActiveGamesFilters(filterGroups),
);

const toggleValue = (
  groupName: GamesFilterGroupState['name'],
  value: string,
) => {
  filterGroups = toggleGamesFilterValue(filterGroups, groupName, value);
};

const resetFilters = () => {
  query = '';
  filterGroups = createGamesFilterGroups(data.filterOptions);
};
</script>

<section class="md:grid md:grid-cols-[1fr_20rem] w-full gap-4">
  <div
    class="flex overflow-hidden flex-col gap-4 p-4 w-full rounded-xl bg-base-100 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  >
    {#each filteredGames as { id, image, name } (id)}
      <a href={`/games/${id}`}>
        <div class="overflow-hidden relative h-60 rounded-lg bg-base-200">
          <img
            src={image}
            loading="lazy"
            alt={name}
            class="object-cover w-full h-full"
          >
          <div
            class="bg-base-300/20 hover:bg-base-300/0 h-full w-full p-4 absolute top-0 font-bold"
          >
            {name}
          </div>
        </div>
      </a>
    {:else}
      <div class="col-span-full py-8 text-center opacity-60">
        Aucun jeu ne correspond aux filtres.
      </div>
    {/each}
  </div>
  <div
    class={cn(
  'not-md:fixed md:w-full top-24 md:top-0 right-2 not-md:w-12 transition-all relative',
  isOpen && 'w-75! max-w-full p-4',
)}
  >
    <div
      class="flex flex-col items-end bg-base-300 md:w-full md:sticky md:top-8 md:h-[calc(100vh-4rem)] p-1 rounded-xl md:p-4 w-full h-full"
    >
      <button
        type="button"
        class="p-2 rounded-lg md:hidden hover:bg-base-200"
        onclick={() => {
  isOpen = !isOpen;
}}
      >
        {#if isOpen}
          <X />
        {:else}
          <Funnel />
        {/if}
      </button>

      <div
        class="flex flex-col gap-3 w-full not-md:p-4"
        class:not-md:hidden={!isOpen}
      >
        <Input
          placeholder="Rechercher un nom ou un n° de thread"
          classes="w-full"
          value={query}
          oninput={(e) => {
  query = e.currentTarget.value;
}}
        />
        <div class="flex gap-2 justify-between items-center">
          <span class="text-sm font-bold">Filtres</span>
          {#if hasFilters}
            <button
              type="button"
              class="text-xs underline opacity-70 cursor-pointer hover:opacity-100"
              onclick={resetFilters}
            >
              Réinitialiser
            </button>
          {/if}
        </div>
        <div class="flex flex-wrap gap-2">
          {#each filterGroups as group (group.name)}
            <GamesFilterGroup
              {group}
              onToggle={(value) => toggleValue(group.name, value)}
            />
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>
