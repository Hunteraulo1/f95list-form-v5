<script lang="ts">
import { Check } from '@lucide/svelte';
import { cn } from '$lib/utils/cn';

interface Props {
  labels: string[];
  //? Étape en cours (indice dans `labels`) ; les précédentes sont marquées comme faites.
  current: number;
}

const { labels, current }: Props = $props();
</script>

<ol class="flex items-start overflow-x-auto" aria-label="Étapes">
  {#each labels as label, index (label)}
    <li
      class="relative flex min-w-20 flex-1 flex-col items-center gap-1 text-xs"
      aria-current={index === current ? 'step' : undefined}
    >
      {#if index > 0}
        <span
          class={cn(
  'absolute top-3 right-1/2 h-0.5 w-full -translate-y-1/2',
  index <= current ? 'bg-primary' : 'bg-base-content/20',
)}
          aria-hidden="true"
        ></span>
      {/if}
      <span
        class={cn(
  'relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-bold',
  index <= current
    ? 'bg-primary text-neutral-content'
    : 'bg-base-300 text-base-content/70',
)}
      >
        {#if index < current}
          <Check size="14" aria-hidden="true" />
        {:else}
          {index + 1}
        {/if}
      </span>
      <span class={cn(index === current && 'font-bold')}>{label}</span>
    </li>
  {/each}
</ol>
