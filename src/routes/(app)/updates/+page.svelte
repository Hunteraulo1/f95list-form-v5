<script lang="ts">
	import { Funnel, X } from "@lucide/svelte";
	import { cn } from "$lib/utils/cn.js";
	import type { PageData } from "./$types";

	interface Props {
		data: PageData;
	}
	const { data }: Props = $props();

	let isOpen = $state(false);

	const gamesByDay = $derived.by(() => {
		const groups = new Map<string, typeof data.games>();
		for (const item of data.games) {
			const key = new Date(item.date).toLocaleDateString("fr-FR", {
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
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

<section class="md:grid md:grid-cols-[1fr_20rem] w-full gap-4">
	<div
		class="w-full bg-base-100 flex flex-col gap-6 p-4 rounded-xl overflow-hidden"
	>
		{#each gamesByDay as [day, games] (day)}
			<div>
				<h2 class="text-lg font-semibold capitalize mb-2">{day}</h2>
				<div
					class="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
				>
					{#each games as { id, editionName, image, name } (id)}
						<div
							class="bg-base-200 h-60 rounded-lg overflow-hidden relative"
						>
							<img
								src={image}
								loading="lazy"
								alt="image de {editionName} - {name}"
								class="object-cover w-full h-full"
							/>
							<div
								class="bg-base-200/30 h-full w-full p-4 absolute top-0"
							>
								{editionName} - {name}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<div
		class={cn(
			"flex flex-col items-end not-md:fixed md:w-full bg-base-300 top-24 right-2 not-md:w-12 p-2 md:p-4 rounded-xl transition-all",
			isOpen && "w-75! max-w-full p-4",
		)}
	>
		<div class="md:hidden p-1 hover:bg-base-200 rounded-lg">
			{#if isOpen}
				<X
					onclick={() => {
						isOpen = !isOpen;
					}}
				/>
			{:else}
				<Funnel
					onclick={() => {
						isOpen = !isOpen;
					}}
				/>
			{/if}
		</div>

		<div class="w-full" class:not-md:hidden={!isOpen}>is open</div>
	</div>
</section>
