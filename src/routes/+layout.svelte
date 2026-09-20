<script lang="ts">
import type { Snippet } from 'svelte';
import favicon from '$lib/assets/favicon.svg';
import ImpersonationBanner from '$lib/components/ui/ImpersonationBanner.svelte';
import QueryProvider from '$lib/query/QueryProvider.svelte';
import '../app.css';
import type { LayoutData } from './$types';

interface Props {
  children: Snippet;
  data: LayoutData;
}

let { children, data }: Props = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon}>
</svelte:head>

<QueryProvider>
  <main class="h-full min-h-screen bg-base-200 pb-16 font-[Fustat]">
    {@render children()}
  </main>

  {#if data.impersonator && data.user}
    <ImpersonationBanner
      as={data.user.name}
      role={data.user.role.label}
      from={data.impersonator.name}
    />
  {/if}
</QueryProvider>
