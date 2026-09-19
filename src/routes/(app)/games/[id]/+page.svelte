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
  class="flex relative flex-col gap-4 mb-4 min-h-60 md:grid md:grid-cols-5"
>
  <div
    class="overflow-hidden col-span-3 w-full h-full text-2xl font-bold bg-center bg-no-repeat bg-cover rounded-xl bg-base-100 hover:bg-contain"
    style="background-image: url({data.game.image});"
  >
    <div
      class="flex flex-col justify-center items-center p-4 w-full h-full transition-all select-none hover:opacity-0 bg-base-300/40"
    >
      {data.game.name}
      <span class="text-sm">{data.game.description}</span>
    </div>
  </div>
  <div
    class="flex flex-col col-span-2 gap-2 p-4 max-h-full rounded-xl bg-base-100 min-h-60"
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
  <div class="flex relative flex-col gap-4 p-4 w-full rounded-xl bg-base-100">
    <span class="font-bold text-center">Traductions</span>
    <Button
      label="Ajouter une traduction"
      size="small"
      classes="w-45 absolute right-4"
    />
    {#each data.game.gameEditions as edition}
      <div class="flex flex-col gap-2 w-full rounded-xl bg-base-200">
        <span class="p-4">
          {edition.name}
        </span>

        <div class="flex overflow-x-scroll gap-2 px-4 pb-4 w-full">
          {#each edition.gameTranslations as translation}
            <div
              class="flex flex-col gap-4 p-2 w-60 rounded-xl bg-base-300 min-w-60"
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
                {@const link = translation.files[0].internalLink}
                <Button
                  label="Télécharger depuis F95France"
                  onclick={() => open(link, 'blank_')}
                  size="big"
                />
                {link}
              {/if}
              {#if translation.files[0].externalLink}
                {@const link = translation.files[0].externalLink}
                <Button
                  label="Télécharger depuis {getHostname(link)}"
                  onclick={() => open(link, 'blank_')}
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
