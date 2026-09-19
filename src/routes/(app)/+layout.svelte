<script lang="ts">
import type { Snippet } from 'svelte';
import Header from '$lib/components/Header.svelte';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();
</script>

<Header />
<div class="px-4 py-8 mx-auto max-w-7xl md:px-8 lg:px-16 md:py-16 ax-w-7xl">
  {@render children()}
</div>
