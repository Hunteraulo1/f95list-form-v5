<script lang="ts">
import { Check, ChevronDown, Minus } from '@lucide/svelte';
import {
  type GamesFilterGroupState,
  gamesFilterGroupSummary,
} from '$lib/games/games-filter';
import { cn } from '$lib/utils/cn.js';

interface Props {
  group: GamesFilterGroupState;
  onToggle: (value: string) => void;
}

const { group, onToggle }: Props = $props();

let details: HTMLDetailsElement | undefined = $state();
const summary = $derived(gamesFilterGroupSummary(group));
const hasSelection = $derived(group.values.some((v) => v.checked));

const closeOnOutsideClick = (event: MouseEvent) => {
  if (details && !details.contains(event.target as Node)) {
    details.open = false;
  }
};
</script>

<svelte:window onclick={closeOnOutsideClick} />

<details bind:this={details} class="relative w-full">
  <summary
    class={cn(
  'flex gap-1.5 items-center px-3 py-2 text-xs font-bold list-none rounded-lg transition-all cursor-pointer select-none',
  hasSelection
    ? 'bg-primary text-primary-content'
    : 'bg-base-200 hover:bg-base-300',
)}
  >
    <span class="truncate max-w-40">{summary}</span>
    <ChevronDown class="opacity-70 size-3.5 shrink-0" />
  </summary>

  <ul
    class="flex overflow-y-auto flex-col gap-0.5 p-1 w-full max-h-64 rounded-lg shadow-lg bg-base-100"
  >
    {#each group.values as entry (entry.value)}
      <li>
        <button
          type="button"
          class="flex gap-2 items-center px-2 py-1.5 w-full text-xs text-left rounded-md cursor-pointer hover:bg-base-200"
          onclick={() => onToggle(entry.value)}
        >
          <span class="flex justify-center items-center size-3.5 shrink-0">
            {#if entry.checked}
              {#if entry.inverse}
                <Minus class="size-3.5 text-error" />
              {:else}
                <Check class="size-3.5 text-success" />
              {/if}
            {/if}
          </span>
          <span class="truncate">{entry.label}</span>
        </button>
      </li>
    {/each}
  </ul>
</details>
