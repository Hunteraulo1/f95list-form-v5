<script lang="ts">
import { Funnel, X } from 'lucide-svelte';
import { cn } from '$lib/utils/cn.js';
import type { PageData } from './$types.js';

interface Props {
  data: PageData;
}
const { data }: Props = $props();

let isOpen = $state(false);
</script>

<section class="md:grid md:grid-cols-[1fr_20rem] w-full gap-4">
	<div
		class="w-full bg-base-100 flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 rounded-xl overflow-hidden"
	>
		{#each data.games as { id, editionName, image, name } (id)}
			<div
				class="bg-base-200 h-60 bg-cover rounded-lg overflow-hidden"
				style="background-image: url({image});"
			>
				<div class="z-10 bg-base-200/50 w-full h-full p-4">
					{editionName} - {name}
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
