<script lang="ts">
import type { Snippet } from 'svelte';
import Header from '$lib/components/Header.svelte';

interface Props {
  children: Snippet;
}

const { children }: Props = $props();
</script>

<div>
  <Header />
  <div class="flex gap-8 p-8 mx-auto w-full max-w-7xl h-full">
    {@render children()}
  </div>
</div>
