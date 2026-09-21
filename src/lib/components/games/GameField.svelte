<script lang="ts">
import { CircleHelp } from '@lucide/svelte';
import type { Snippet } from 'svelte';
import { cn } from '$lib/utils/cn';

interface Props {
  label: string;
  id: string;
  //? Champ masqué (mais gardé dans le formulaire) quand il n'appartient pas à l'étape en cours.
  hidden?: boolean;
  //? Aide affichée au survol du « ? » à côté du libellé.
  help?: string;
  class?: string;
  children: Snippet;
}

const {
  label,
  id,
  hidden = false,
  help,
  class: className,
  children,
}: Props = $props();
</script>

<div class={cn('flex flex-col gap-1', hidden && 'hidden', className)}>
  <div class="flex items-center gap-1">
    <label for={id} class="text-sm font-bold">{label} :</label>
    {#if help}
      <span class="group relative inline-flex">
        <button
          type="button"
          class="cursor-help opacity-60 hover:opacity-100"
          aria-label="Aide : {label}"
        >
          <CircleHelp size="14" aria-hidden="true" />
        </button>
        <span
          role="tooltip"
          class="pointer-events-none absolute bottom-full left-0 z-30 mb-1 hidden w-64 rounded-xl border-2 border-base-content bg-base-100 p-2 text-xs font-normal shadow-lg group-focus-within:block group-hover:block"
        >
          {help}
        </span>
      </span>
    {/if}
  </div>
  <div class="flex items-start gap-1">
    {@render children()}
  </div>
</div>
