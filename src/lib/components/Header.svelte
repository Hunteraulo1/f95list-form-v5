<script lang="ts">
import { Moon, Sun } from 'lucide-svelte';
import { getTheme, toggleTheme } from '$lib/stores/theme.svelte';
</script>

<header class="flex items-center justify-between bg-base-100 px-4 py-3 text-base-content">
	<button
		type="button"
		onclick={toggleTheme}
		aria-label="Basculer le thème"
		class="rounded-field p-2 hover:bg-base-200"
	>
		{#if getTheme() === 'dark'}
			<Sun size={20} />
		{:else}
			<Moon size={20} />
		{/if}
	</button>
</header>
