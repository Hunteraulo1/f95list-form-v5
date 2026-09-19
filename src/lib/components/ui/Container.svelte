<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  children?: Snippet;
  classes?: string;
}

const { children, classes = '' }: Props = $props();
</script>

<div
  class={'px-4 mx-auto max-x-full sm:p-0 sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl' +
  classes}
>
  {@render children?.()}
</div>
