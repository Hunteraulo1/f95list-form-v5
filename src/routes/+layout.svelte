<script lang="ts">
import type { Snippet } from 'svelte';
import { page } from '$app/state';
import favicon from '$lib/assets/favicon.svg';
import Header from '$lib/components/Header.svelte';
import QueryProvider from '$lib/query/QueryProvider.svelte';
import '../app.css';
import { cn } from '$lib/utils/cn';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();
const isNotHome = $derived(page.url.pathname !== '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<QueryProvider>
	<main class="bg-base-200 min-h-screen h-full font-[Fustat] pb-16">
		{#if isNotHome}
			<Header />
		{/if}
		<div
			class={cn(
				isNotHome &&
					"md:px-8 lg:px-16 md:py-16 py-8 px-4 ax-w-7xl mx-auto max-w-7xl",
			)}
		>
			{@render children()}
		</div>
	</main>
</QueryProvider>
