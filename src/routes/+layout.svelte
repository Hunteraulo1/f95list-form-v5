<script lang="ts">
import { page } from '$app/state';
import favicon from '$lib/assets/favicon.svg';
import Header from '$lib/components/Header.svelte';
import QueryProvider from '$lib/query/QueryProvider.svelte';
import '../app.css';

let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<QueryProvider>
	<main class="bg-base-200 min-h-screen h-full font-[Poppins]">
		{#if page.url.pathname !== "/"}
			<Header />
		{/if}
		{@render children()}
	</main>
</QueryProvider>
