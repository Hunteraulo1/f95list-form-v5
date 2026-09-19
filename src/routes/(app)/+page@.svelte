<script lang="ts">
import homeBgDark from '$lib/assets/motif-dark.png';
import homeBgLight from '$lib/assets/motif-light.png';
import Header from '$lib/components/Header.svelte';
import Container from '$lib/components/ui/Container.svelte';
import HomeBoxMockup from '$lib/components/ui/home/HomeBoxMockups.svelte';
import HomeList from '$lib/components/ui/home/HomeGameList.svelte';
import HomeHero from '$lib/components/ui/home/HomeHero.svelte';
import { getTheme } from '$lib/stores/theme.svelte';
import type { PageData } from './$types';

const isDark = $derived(getTheme() === 'dark');

interface Props {
  data: PageData;
}

const { data }: Props = $props();
</script>

<div class="overflow-hidden relative w-vw max-w-lvw min-h-150">
  <div
    class="absolute bg-repeat -inset-1/1 -rotate-16 bg-size-[16rem_auto]"
    style="background-image: url({isDark ? homeBgDark : homeBgLight});"
    class:opacity-2={isDark}
    class:opacity-4={!isDark}
  ></div>

  <div
    class="absolute inset-x-0 bottom-0 h-40 to-transparent bg-linear-to-t from-base-200"
  ></div>
  <div class="relative h-full">
    <Header isHome />

    <HomeHero stats={data.stats} />
  </div>
</div>

<Container>
  <HomeList
    classes="md:-translate-y-32 max-md:mb-16"
    title="Les dernières traductions"
    games={data.games}
    aboutLink="/updates"
  />

  <HomeBoxMockup />
</Container>
