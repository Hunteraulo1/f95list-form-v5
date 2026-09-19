<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  children?: Snippet;
  classes?: string;
}

const { children, classes = '' }: Props = $props();
</script>

<div
  class={'max-x-full mx-auto px-4 sm:max-w-xl sm:p-0 md:max-w-2xl lg:max-w-4xl xl:max-w-6xl' +
  classes}
>
  {@render children?.()}
</div>
