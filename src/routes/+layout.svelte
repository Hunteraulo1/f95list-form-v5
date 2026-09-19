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
  <main class="bg-base-200 min-h-screen h-full font-[Fustat] pb-16">
    {@render children()}
  </main>
</QueryProvider>
