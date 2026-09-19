<script lang="ts">
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
  class="relative mb-4 flex min-h-60 flex-col gap-4 md:grid md:grid-cols-5"
>
  <div
    class="col-span-3 h-full w-full overflow-hidden rounded-xl bg-base-100 bg-cover bg-center bg-no-repeat text-2xl font-bold hover:bg-contain"
    style="background-image: url({data.game.image});"
  >
    <div
      class="flex h-full w-full flex-col items-center justify-center bg-base-300/40 p-4 transition-all select-none hover:opacity-0"
    >
      {data.game.name}
      <span class="text-sm">{data.game.description}</span>
    </div>
  </div>
  <div
    class="col-span-2 flex max-h-full min-h-60 flex-col gap-2 rounded-xl bg-base-100 p-4"
  >
    <div class="overflow-y-scroll">
      <div class="font-bold">Tags:</div>
      {#each data.game.tags as tag, index}
        {#if index !== 0}
          ,
        {/if}
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
      onclick={() => open(data.game.link, 'blank_')}
    />
  </div>
</section>

<section>
  <div class="relative flex w-full flex-col gap-4 rounded-xl bg-base-100 p-4">
    <span class="text-center font-bold">Traductions</span>
    <Button
      label="Ajouter une traduction"
      size="small"
      classes="w-45 absolute right-4"
    />
    {#each data.game.gameEditions as edition}
      <div class="flex w-full flex-col gap-2 rounded-xl bg-base-200">
        <span class="p-4">
          {edition.name}
        </span>

        <div class="flex w-full gap-2 overflow-x-scroll px-4 pb-4">
          {#each edition.gameTranslations as translation}
            <div
              class="flex w-60 min-w-60 flex-col gap-4 rounded-xl bg-base-300 p-2"
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
                {@render downloadButton(
  translation.files[0].internalLink,
  'Télécharger depuis F95France',
)}
              {/if}
              {#if translation.files[0].externalLink}
                {@render downloadButton(
  translation.files[0].externalLink,
  `Télécharger depuis ${getHostname(translation.files[0].externalLink)}`,
)}
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</section>

{#snippet downloadButton(
  link: string,
  label: string,
)}
  <Button {label} onclick={() => open(link, 'blank_')} size="big" />
{/snippet}
