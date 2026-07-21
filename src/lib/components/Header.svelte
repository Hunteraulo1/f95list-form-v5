<script lang="ts">
import { Moon, Sun } from 'lucide-svelte';
import { page } from '$app/state';
import banner from '$lib/assets/banner.webp';
import { getTheme, toggleTheme } from '$lib/stores/theme.svelte';

const { isHome = false } = $props();

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
		<img src={banner} alt="bannière de f95 france" class="h-full" />
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
		{#if getTheme() === "dark"}
			<Sun size={20} />
		{:else}
			<Moon size={20} />
		{/if}
	</button>
</header>
