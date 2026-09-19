<script lang="ts">
import { ArrowRight } from '@lucide/svelte';
import { onMount } from 'svelte';
import type { Game, GameTranslation } from '$lib/server/db/entities';
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

<section class={cn('flex flex-col gap-4', classes)}>
  <h3 class="text-xl font-bold">{title}</h3>
  <div
    class="grid min-h-60 w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
  >
    {#each games.slice(0, max) as { name, image, id }}
      <a href="/games/{id}">
        <article
          class="relative h-60 w-full cursor-pointer rounded-xl bg-base-300 shadow transition-all hover:-rotate-1 hover:shadow-md hover:md:-rotate-2"
        >
          <div
            class="relative z-10 flex h-full flex-col justify-end bg-base-300/20 p-4 hover:bg-base-300/0"
          >
            <h4 class="text-md text-center font-bold">
              {name}
            </h4>
          </div>
          <div class="absolute top-0 h-full w-full">
            {#if image}
              <img
                src={image}
                alt={`image de ${name}`}
                class="h-full w-full rounded-2xl object-cover p-2 opacity-100"
              >
            {:else}
              <div
                class="flex h-full w-full items-center justify-center text-sm text-base-content/20"
              >
                Aucune image
              </div>
            {/if}
          </div>
        </article>
      </a>
    {/each}
    {#if aboutLink}
      <a href={aboutLink}>
        <article
          class="relative h-60 w-full cursor-pointer rounded-xl bg-base-300 shadow transition-all hover:-rotate-1 hover:shadow-md hover:md:-rotate-2"
        >
          <div class="absolute top-0 h-full w-full">
            <div
              class="flex h-full w-full flex-col items-center justify-center gap-2 text-sm font-bold text-base-content/20"
            >
              En voir plus

              <div class="rounded-full bg-base-200 p-2">
                <ArrowRight />
              </div>
            </div>
          </div>
        </article>
      </a>
    {/if}
  </div>
</section>
