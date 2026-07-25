<script lang="ts">
import { Moon, Sun } from 'lucide-svelte';
import bannerDark from '$lib/assets/banner-dark.webp';
import bannerLight from '$lib/assets/banner-light.png';
import { getTheme, toggleTheme } from '$lib/stores/theme.svelte';

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
    title: 'Test',
    href: '/test',
  },
];
</script>

<header
	class="flex items-center justify-between text-base-content h-16 p-5"
	class:bg-base-100={!isHome}
	class:h-24={isHome}
	class:p-8={isHome}
>
	<a href="/" class="sm:h-full sm:aspect-8/1">
		{#if isDark}
			<img src={bannerDark} alt="bannière de f95 france" class="h-full" />
		{:else}
			<img
				src={bannerLight}
				alt="bannière de f95 france"
				class="h-full"
			/>
		{/if}
	</a>

	<ul class="flex gap-8 w-full px-16 font-bold">
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
		class="rounded-field p-2 hover:bg-base-200"
	>
		{#if isDark}
			<Sun size={20} />
		{:else}
			<Moon size={20} />
		{/if}
	</button>
</header>
