<script lang="ts">
import { Menu, Moon, Sun, X } from '@lucide/svelte';
import bannerDark from '$lib/assets/banner-dark.webp';
import bannerLight from '$lib/assets/banner-light.png';
import { getTheme, toggleTheme } from '$lib/stores/theme.svelte';
import { cn } from '$lib/utils/cn';

interface Props {
  isHome?: boolean;
}

const { isHome = false }: Props = $props();

const isDark = $derived(getTheme() === 'dark');
interface Nav {
  title: string;
  href: string;
}

const nav: Nav[] = [
  {
    title: 'Home',
    href: '/',
  },
  {
    title: 'Jeux',
    href: '/games',
  },
  {
    title: 'Mises à jour',
    href: '/updates',
  },
  {
    title: 'Tableau de bord',
    href: '/dashboard',
  },
];

let isOpen = $state(false);
</script>

<header
  class="flex justify-between items-center p-5 h-16 text-base-content"
  class:bg-base-100={!isHome}
  class:h-24={isHome}
  class:p-8={isHome}
>
  <Menu
    onclick={() => (isOpen = true)}
    class={cn(
  isOpen && 'hidden',
  'p-1 rounded-lg cursor-pointer md:hidden dark:hover:bg-base-300 hover:bg-base-100 size-8',
)}
  />
  <a href="/" class="h-1/2 sm:h-full aspect-8/1">
    {#if isDark}
      <img
        src={bannerDark}
        alt="bannière de f95 france"
        class="h-full"
        draggable="false"
      >
    {:else}
      <img src={bannerLight} alt="bannière de f95 france" class="h-full">
    {/if}
  </a>

  <ul
    class="flex top-0 left-0 z-50 gap-4 px-16 font-bold not-md:flex-col md:gap-8 md:w-full not-md:fixed not-md:bg-base-200 w-75 not-md:h-screen not-md:pt-20"
    class:not-md:hidden={!isOpen}
  >
    <X
      class="absolute top-8 left-8 p-1 rounded-lg cursor-pointer md:hidden hover:bg-base-300 size-8"
      onclick={() => {
  isOpen = false;
}}
    />
    <div class="flex mb-4 w-full md:hidden">
      {#if isDark}
        <img src={bannerDark} alt="bannière de f95 france">
      {:else}
        <img src={bannerLight} alt="bannière de f95 france">
      {/if}
    </div>
    {#each nav as { title, href }}
      <li>
        <a {href}>{title}</a>
      </li>
    {/each}
  </ul>

  <button
    type="button"
    onclick={toggleTheme}
    aria-label="Basculer le thème"
    class="p-2 rounded-field dark:hover:bg-base-300 hover:bg-base-100"
  >
    {#if isDark}
      <Sun size={20} />
    {:else}
      <Moon size={20} />
    {/if}
  </button>
</header>
