<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  badge: string;
  children: Snippet;
}

let { badge, children }: Props = $props();
</script>

<div class="p-8 w-full h-full transform-3d">
  <div
    class="flex relative flex-col gap-2 p-4 w-full h-full min-h-0 rounded-2xl border shadow-2xl hero-mockup-shell border-base-content/20 bg-base-100/85"
  >
    <div class="flex items-center px-0.5 pt-0.5 pb-1 shrink-0">
      <span class="badge badge-outline badge-primary">{badge}</span>
    </div>
    <div class="overflow-hidden flex-1 min-h-0">
      {@render children()}
    </div>
  </div>
</div>
