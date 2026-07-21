<script lang="ts">
import type { Snippet } from 'svelte';
import { cn } from '$lib/utils/cn';

const {
  children,
  title,
  classes,
}: {
  children: Snippet<[number]>;
  title: string;
  classes?: string;
  max?: number;
} = $props();

const maxItemList: Record<number, number> = {
  0: 1,
  640: 2,
  768: 3,
  1024: 4,
  1280: 5,
};

function getMaxItems(width: number) {
  const breakpoints = Object.keys(maxItemList)
    .map(Number)
    .sort((a, b) => b - a);

  const breakpoint = breakpoints.find((bp) => width >= bp) ?? 0;
  return maxItemList[breakpoint];
}

let innerWidth = $state(0);
const max = $derived(getMaxItems(innerWidth));
</script>

<svelte:window bind:innerWidth />

<section class={cn("flex flex-col gap-4", classes)}>
	<h3 class="text-xl font-bold">{title}</h3>
	<div
		class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full h-60 gap-4"
	>
		{@render children(max)}
	</div>
</section>
