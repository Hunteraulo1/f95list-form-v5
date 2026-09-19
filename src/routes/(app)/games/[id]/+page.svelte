<script lang="ts">
import { onMount } from 'svelte';
import Button from '$lib/components/ui/Button.svelte';
import type { PageData } from './$types.js';

interface Props {
  data: PageData;
}

const { data }: Props = $props();

const getHostname = (link: string) => {
  try {
    return `${new URL(link).hostname}`;
  } catch {
    return 'un site externe';
  }
};
</script>

<section
	class="mb-4 min-h-60 md:grid md:grid-cols-5 flex gap-4 flex-col relative"
>
	<div
		class="bg-base-100 bg-cover hover:bg-contain bg-no-repeat bg-center rounded-xl w-full h-full text-2xl font-bold col-span-3 overflow-hidden"
		style="background-image: url({data.game.image});"
	>
		<div
			class="hover:opacity-0 bg-base-300/40 h-full w-full flex flex-col justify-center items-center p-4 transition-all select-none"
		>
			{data.game.name}
			<span class="text-sm">{data.game.description}</span>
		</div>
	</div>
	<div
		class="p-4 bg-base-100 rounded-xl col-span-2 flex flex-col gap-2 min-h-60 max-h-full"
	>
		<div class="overflow-y-scroll">
			<div class="font-bold">Tags:</div>
			{#each data.game.tags as tag, index}
				{#if index !== 0},{/if}
				{tag.name}
			{/each}
		</div>

		<div>
			<span class="font-bold">ID du thread:</span>
			{data.game.threadId}
		</div>

		<Button
			label="Accèder à {getHostname(data.game.link)}"
			classes="mt-auto"
			onclick={() => open(data.game.link, "blank_")}
		/>
	</div>
</section>

<section>
	<div class="w-full bg-base-100 flex flex-col rounded-xl p-4 gap-4 relative">
		<span class="text-center font-bold">Traductions</span>
		<Button
			label="Ajouter une traduction"
			size="small"
			classes="w-45 absolute right-4"
		/>
		{#each data.game.gameEditions as edition}
			<div class="w-full bg-base-200 flex flex-col rounded-xl gap-2">
				<span class="p-4">
					{edition.name}
				</span>

				<div class="flex gap-2 w-full overflow-x-scroll px-4 pb-4">
					{#each edition.gameTranslations as translation}
						<div
							class="flex flex-col gap-4 bg-base-300 rounded-xl p-2 w-60 min-w-60"
						>
							<span>Version: {translation.version}</span>

							<span>
								{#if translation.translators.length === 1}
									Traducteur:
									{translation.translators[0].name}
								{:else if translation.translators.length > 1}
									Traducteurs:
									{#each translation.translators as translator, index}
										{translator.name}
										{#if index >= 0 && translation.translators.length !== index + 1}
											,
										{/if}
									{/each}
								{:else}
									Traducteur: Aucun
								{/if}
							</span>

							<span>Qualité: {translation.quality}</span>
							<span>Type: {translation.type}</span>
							{#if translation.files[0].internalLink}
								{@const link =
									translation.files[0].internalLink}
								<Button
									label="Télécharger depuis F95France"
									onclick={() => open(link, "blank_")}
									size="big"
								/>
								{link}
							{/if}
							{#if translation.files[0].externalLink}
								{@const link =
									translation.files[0].externalLink}
								<Button
									label="Télécharger depuis {getHostname(
										link,
									)}"
									onclick={() => open(link, "blank_")}
									size="big"
								/>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
