<script lang="ts">
	import { ArrowRight } from "@lucide/svelte";
	import { onMount } from "svelte";
	import type {
		Game,
		GameEdition,
		GameTranslation,
	} from "$lib/server/db/schema";
	import { cn } from "$lib/utils/cn";

	interface LatestTranslation {
		id: GameTranslation["id"];
		name: Game["name"];
		editionName: GameEdition["name"];
		image: Game["imageExternal"];
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
		class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full min-h-60 gap-4"
	>
		{#each games.slice(0, max) as { name, editionName, image }}
			<article
				class="bg-base-300 w-full h-60 rounded-xl relative hover:-rotate-1 hover:md:-rotate-2 transition-all cursor-pointer shadow hover:shadow-md"
			>
				<div class="flex flex-col justify-end h-full p-4 z-10 relative">
					<h4 class="font-bold text-md text-center">
						{name} - {editionName}
					</h4>
				</div>
				<div class="absolute top-0 h-full w-full">
					{#if image}
						<img
							src={image}
							alt={`image de ${name} - ${editionName}`}
							class="h-full w-full object-cover p-2 rounded-2xl opacity-90"
						/>
					{:else}
						<div
							class="h-full w-full flex justify-center items-center text-base-content/20 text-sm"
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
					class="bg-base-300 w-full h-60 rounded-xl relative hover:-rotate-1 hover:md:-rotate-2 transition-all cursor-pointer shadow hover:shadow-md"
				>
					<div class="absolute top-0 h-full w-full">
						<div
							class="h-full w-full flex flex-col justify-center items-center text-base-content/20 text-sm gap-2 font-bold"
						>
							En voir plus

							<div class="bg-base-200 rounded-full p-2">
								<ArrowRight />
							</div>
						</div>
					</div>
				</article>
			</a>
		{/if}
	</div>
</section>
