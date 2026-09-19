<script lang="ts">
import type { Snippet } from 'svelte';
import Header from '$lib/components/Header.svelte';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();
</script>

<Header />
<div class="ax-w-7xl mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-16 lg:px-16">
  {@render children()}
</div>
