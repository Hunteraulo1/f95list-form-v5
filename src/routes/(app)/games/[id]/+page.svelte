<script lang="ts">
import Button from '$lib/components/ui/Button.svelte';
import ColorBadge from '$lib/components/ui/games/ColorBadge.svelte';
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
  <div class="flex w-full flex-col gap-4 rounded-xl bg-base-100 p-4">
    <div class="flex items-center justify-between gap-2">
      <span class="font-bold">Traductions</span>
      <Button label="Ajouter une traduction" size="small" />
    </div>

    {#each data.game.gameEditions as edition}
      <div class="flex flex-col gap-2">
        <span class="font-bold">{edition.name}</span>

        <div
          class="flex flex-col divide-y divide-base-content/10 overflow-hidden rounded-xl bg-base-200"
        >
          {#each edition.gameTranslations as translation}
            <div
              class="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div class="flex flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-bold">{translation.version}</span>
                  <ColorBadge
                    item={translation.quality}
                    label={translation.qualityLabel}
                  />
                  <ColorBadge
                    item={translation.type}
                    label={translation.typeLabel}
                  />
                </div>

                <span class="text-sm text-base-content/70">
                  {#if translation.translators.length > 0}
                    Par
                    {translation.translators.map((translator) => translator.name).join(', ')}
                  {:else}
                    Aucun traducteur
                  {/if}
                </span>
              </div>

              <div class="flex flex-wrap gap-2 md:justify-end">
                {#if translation.file?.internalLink}
                  {@render downloadLink(translation.file.internalLink, 'F95France', false)}
                {/if}
                {#if translation.file?.externalLink}
                  {@render downloadLink(
  translation.file.externalLink,
  getHostname(translation.file.externalLink),
  Boolean(translation.file.internalLink),
)}
                {/if}
                {#if !translation.file?.internalLink && !translation.file?.externalLink}
                  <span class="text-sm text-base-content/70"
                    >Aucun fichier</span
                  >
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</section>

{#snippet downloadLink(
  link: string,
  label: string,
  secondary: boolean,
)}
  <Button
    {label}
    inline={secondary}
    onclick={() => open(link, '_blank', 'noopener')}
  />
{/snippet}
