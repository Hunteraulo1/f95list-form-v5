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
		class="w-full bg-base-100 flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 rounded-xl overflow-hidden"
	>
		{#each filteredGames as { id, image, name } (id)}
			<a href={`/games/${id}`}>
				<div
					class="bg-base-200 h-60 rounded-lg overflow-hidden relative"
				>
					<img
						src={image}
						loading="lazy"
						alt="image de {name}"
						class="object-cover w-full h-full"
					/>
					<div
						class="bg-base-200/20 hover:bg-base-200/10 h-full w-full p-4 absolute top-0"
					>
						{name}
					</div>
				</div>
			</a>
		{:else}
			<div class="col-span-full text-center py-8 opacity-60">
				Aucun jeu ne correspond aux filtres.
			</div>
		{/each}
	</div>
	<div
		class={cn(
			"not-md:fixed md:w-full top-24 md:top-0 right-2 not-md:w-12 transition-all relative",
			isOpen && "w-75! max-w-full p-4",
		)}
	>
		<div
			class="flex flex-col items-end bg-base-300 md:w-full md:sticky md:top-8 md:h-[calc(100vh-4rem)] p-1 rounded-xl md:p-4 w-full h-full"
		>
			<button
				class="md:hidden p-2 hover:bg-base-200 rounded-lg"
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
				class="w-full flex flex-col gap-3 not-md:p-4"
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
							class="text-xs underline opacity-70 hover:opacity-100 cursor-pointer"
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
