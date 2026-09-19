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

<section class="w-full gap-4 md:grid md:grid-cols-[1fr_20rem]">
  <div
    class="flex w-full flex-col gap-4 overflow-hidden rounded-xl bg-base-100 p-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  >
    {#each filteredGames as { id, image, name } (id)}
      <a href={`/games/${id}`}>
        <div class="relative h-60 overflow-hidden rounded-lg bg-base-200">
          <img
            src={image}
            loading="lazy"
            alt={name}
            class="h-full w-full object-cover"
          >
          <div
            class="absolute top-0 h-full w-full bg-base-300/20 p-4 font-bold hover:bg-base-300/0"
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
  'relative top-24 right-2 transition-all not-md:fixed not-md:w-12 md:top-0 md:w-full',
  isOpen && 'w-75! max-w-full p-4',
)}
  >
    <div
      class="flex h-full w-full flex-col items-end rounded-xl bg-base-300 p-1 md:sticky md:top-8 md:h-[calc(100vh-4rem)] md:w-full md:p-4"
    >
      <button
        type="button"
        class="rounded-lg p-2 hover:bg-base-200 md:hidden"
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
        class="flex w-full flex-col gap-3 not-md:p-4"
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
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-bold">Filtres</span>
          {#if hasFilters}
            <button
              type="button"
              class="cursor-pointer text-xs underline opacity-70 hover:opacity-100"
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
