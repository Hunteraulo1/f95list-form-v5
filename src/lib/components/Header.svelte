<script lang="ts">
import { Menu, Moon, Sun, X } from '@lucide/svelte';
import bannerDark from '#lib/assets/banner-dark.webp';
import bannerLight from '#lib/assets/banner-light.png';
import { getTheme, toggleTheme } from '#lib/stores/theme.svelte.ts';
import { cn } from '#lib/utils/cn.ts';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import Button from './ui/Button.svelte';

interface Props {
  isHome?: boolean;
}

const { isHome = false }: Props = $props();

const isDark = $derived(getTheme() === 'dark');
interface Nav {
  title: string;
  href: string;
  //? Lien traité par le serveur : navigation complète, sans préchargement au survol.
}

//? Sans compte connecté, le tableau de bord laisse la place à la connexion.
const nav = $derived<Nav[]>([
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
]);

let isOpen = $state(false);
</script>

<header
  class="flex h-16 items-center justify-between p-5 text-base-content"
  class:bg-base-100={!isHome}
  class:h-24={isHome}
  class:p-8={isHome}
>
  <Menu
    onclick={() => (isOpen = true)}
    class={cn(
      isOpen && 'hidden',
      'size-8 cursor-pointer rounded-lg p-1 hover:bg-base-100 lg:hidden dark:hover:bg-base-300',
    )}
  />
  <a href="/" class="aspect-8/1 h-1/2 sm:h-full">
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
    class="top-0 left-0 z-50 flex w-75 gap-4 px-16 font-bold not-lg:fixed not-lg:h-screen not-lg:flex-col not-lg:bg-base-200 not-lg:pt-20 lg:w-full lg:gap-8"
    class:not-lg:hidden={!isOpen}
  >
    <X
      class="absolute top-8 left-8 size-8 cursor-pointer rounded-lg p-1 hover:bg-base-300 lg:hidden"
      onclick={() => {
        isOpen = false;
      }}
    />
    <div class="mb-4 flex w-full lg:hidden">
      {#if isDark}
        <img src={bannerDark} alt="bannière de f95 france">
      {:else}
        <img src={bannerLight} alt="bannière de f95 france">
      {/if}
    </div>
    {#each nav as { title, href }}
      <li>
        <a {href}>
          {title}
        </a>
      </li>
    {/each}
  </ul>

  <div class="flex gap-2 lg:gap-4 mr-4">
    {#if page.data.user}
      <Button label="Tableau de bord" onclick={() => goto('/dashboard')} />
    {:else}
      <!-- `/auth/login` est traité par le serveur (redirection vers l'écran de connexion), ce n'est
           pas une page : il faut une vraie navigation, `goto` ne sait pas y aller. -->
      <Button
        label="Se connecter"
        inline
        onclick={() => window.location.assign('/auth/login')}
      />
      <Button label="S'inscrire" onclick={() => goto('/register')} />
    {/if}
  </div>

  <button
    type="button"
    onclick={toggleTheme}
    aria-label="Basculer le thème"
    class="rounded-field p-2 hover:bg-base-100 dark:hover:bg-base-300"
  >
    {#if isDark}
      <Sun size={20} />
    {:else}
      <Moon size={20} />
    {/if}
  </button>
</header>
