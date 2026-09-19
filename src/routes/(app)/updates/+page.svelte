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

const gamesByDay = $derived.by(() => {
  const groups = new Map<string, typeof filteredGames>();
  for (const item of filteredGames) {
    const key = new Date(item.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Paris',
    });
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
});
</script>

<section class="gap-4 w-full md:grid md:grid-cols-[1fr_20rem]">
  <div
    class="flex overflow-hidden flex-col gap-6 p-4 w-full rounded-xl bg-base-100"
  >
    {#each gamesByDay as [day, games] (day)}
      <div>
        <h2 class="mb-2 text-lg font-semibold capitalize">{day}</h2>
        <div
          class="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {#each games as { id, image, name, gameId, updateType } (id)}
            <a href={`/games/${gameId}`}>
              <div class="overflow-hidden relative h-60 rounded-lg bg-base-200">
                <img
                  src={image}
                  loading="lazy"
                  alt={name}
                  class="object-cover w-full h-full"
                >
                <div
                  class="flex absolute top-0 flex-col gap-2 p-4 w-full h-full font-bold bg-base-300/20 hover:bg-base-300/0"
                >
                  <span
                    class="px-2 text-xs font-black uppercase rounded-xl w-fit"
                    class:bg-green-700={updateType === 'ajout'}
                    class:bg-yellow-500={updateType === 'mise à jour'}
                  >
                    {updateType}
                  </span>
                  {name}
                </div>
              </div>
            </a>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  <div
    class={cn(
  'relative right-2 top-24 transition-all not-md:fixed md:w-full md:top-0 not-md:w-12',
  isOpen && 'p-4 max-w-full w-75!',
)}
  >
    <div
      class="flex flex-col items-end p-1 w-full h-full rounded-xl bg-base-300 md:w-full md:sticky md:top-8 md:h-[calc(100vh-4rem)] md:p-4"
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
