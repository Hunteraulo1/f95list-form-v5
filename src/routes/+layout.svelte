<script lang="ts">
import type { Snippet } from 'svelte';
import favicon from '$lib/assets/favicon.svg';
import QueryProvider from '$lib/query/QueryProvider.svelte';
import '../app.css';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon}>
</svelte:head>

<QueryProvider>
  <main class="h-full min-h-screen bg-base-200 pb-16 font-[Fustat]">
    {@render children()}
  </main>
</QueryProvider>
