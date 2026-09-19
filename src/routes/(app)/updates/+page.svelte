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

<section class="w-full gap-4 md:grid md:grid-cols-[1fr_20rem]">
  <div
    class="flex w-full flex-col gap-6 overflow-hidden rounded-xl bg-base-100 p-4"
  >
    {#each gamesByDay as [day, games] (day)}
      <div>
        <h2 class="mb-2 text-lg font-semibold capitalize">{day}</h2>
        <div
          class="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {#each games as { id, image, name, gameId, updateType } (id)}
            <a href={`/games/${gameId}`}>
              <div class="relative h-60 overflow-hidden rounded-lg bg-base-200">
                <img
                  src={image}
                  loading="lazy"
                  alt={name}
                  class="h-full w-full object-cover"
                >
                <div
                  class="absolute top-0 flex h-full w-full flex-col gap-2 bg-base-300/20 p-4 font-bold hover:bg-base-300/0"
                >
                  <span
                    class="w-fit rounded-xl px-2 text-xs font-black uppercase"
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
