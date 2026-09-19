<script lang="ts">
import { QueryClientProvider } from '@tanstack/svelte-query';
import type { Snippet } from 'svelte';
import { queryClient } from './client';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>
