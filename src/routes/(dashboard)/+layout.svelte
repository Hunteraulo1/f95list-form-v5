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
  <div class="mx-auto flex h-full w-full max-w-7xl gap-8 p-8">
    {@render children()}
  </div>
</div>
