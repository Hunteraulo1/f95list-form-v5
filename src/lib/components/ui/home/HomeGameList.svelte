<script lang="ts">
import { ArrowRight } from '@lucide/svelte';
import { onMount } from 'svelte';
import type {
  Game,
  GameEdition,
  GameTranslation,
} from '$lib/server/db/entities';
import { cn } from '$lib/utils/cn';

interface LatestTranslation {
  id: GameTranslation['id'];
  name: Game['name'];
  image: Game['imageExternal'];
}

interface Props {
  title: string;
  classes?: string;
  aboutLink?: string;
  games: LatestTranslation[];
}

const { title, classes, aboutLink, games }: Props = $props();

onMount(() => console.log([games]));

const maxItemList: Record<number, number> = {
  0: 2,
  640: 3,
  768: 5,
  1024: 3,
  1280: 4,
};

function getMaxItems(width: number) {
  const breakpoints = Object.keys(maxItemList)
    .map(Number)
    .sort((a, b) => b - a);

  const breakpoint = breakpoints.find((bp) => width >= bp) ?? 0;
  return maxItemList[breakpoint];
}

let innerWidth = $state(0);
const max = $derived(
  aboutLink ? getMaxItems(innerWidth) : getMaxItems(innerWidth) + 1,
);
</script>

<svelte:window bind:innerWidth />

<section class={cn("flex flex-col gap-4", classes)}>
	<h3 class="text-xl font-bold">{title}</h3>
	<div
		class="grid grid-cols-1 gap-4 w-full sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-h-60"
	>
		{#each games.slice(0, max) as { name, image }}
			<article
				class="relative w-full h-60 rounded-xl shadow transition-all cursor-pointer bg-base-300 hover:-rotate-1 hover:md:-rotate-2 hover:shadow-md"
			>
				<div
					class="flex relative z-10 flex-col justify-end p-4 h-full bg-base-300/20 hover:bg-base-300/0"
				>
					<h4 class="font-bold text-center text-md">
						{name}
					</h4>
				</div>
				<div class="absolute top-0 w-full h-full">
					{#if image}
						<img
							src={image}
							alt={`image de ${name}`}
							class="object-cover p-2 w-full h-full rounded-2xl opacity-100"
						/>
					{:else}
						<div
							class="flex justify-center items-center w-full h-full text-sm text-base-content/20"
						>
							Aucune image
						</div>
					{/if}
				</div>
			</article>
		{/each}
		{#if aboutLink}
			<a href={aboutLink}>
				<article
					class="relative w-full h-60 rounded-xl shadow transition-all cursor-pointer bg-base-300 hover:-rotate-1 hover:md:-rotate-2 hover:shadow-md"
				>
					<div class="absolute top-0 w-full h-full">
						<div
							class="flex flex-col gap-2 justify-center items-center w-full h-full text-sm font-bold text-base-content/20"
						>
							En voir plus

							<div class="p-2 rounded-full bg-base-200">
								<ArrowRight />
							</div>
						</div>
					</div>
				</article>
			</a>
		{/if}
	</div>
</section>
