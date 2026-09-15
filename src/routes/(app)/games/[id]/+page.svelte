<script lang="ts">
import { onMount } from 'svelte';
import type { PageData } from './$types.js';

interface Props {
  data: PageData;
}

const { data }: Props = $props();

onMount(() => console.log('🚀 ~ data:', data));
</script>

<section class="mb-4">
	<div class="w-full bg-base-100 flex justify-center rounded-xl">
		{data.game.name}
	</div>
</section>

<section>
	<div class="w-full bg-base-100 flex flex-col rounded-xl p-4 gap-4">
		{#each data.game.gameEditions as edition}
			<div class="w-full bg-base-200 flex flex-col rounded-xl gap-2">
				<span class="p-4">{edition.name}</span>

				<div class="flex gap-2 w-full overflow-x-scroll px-4 pb-4">
					{#each edition.gameTranslations as translation}
						<div
							class="flex gap-4 bg-base-300 rounded-xl p-2 w-60 min-w-60"
						>
							Version: {translation.version} par
							{#each translation.translators as translator, index}
								{translator.name}
								{#if index >= 0 && translation.translators.length !== index + 1}
									,
								{/if}
							{/each}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
