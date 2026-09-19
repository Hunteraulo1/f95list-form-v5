<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  badge: string;
  children: Snippet;
}

let { badge, children }: Props = $props();
</script>

<div class="h-full w-full p-8 transform-3d">
  <div
    class="hero-mockup-shell relative flex h-full min-h-0 w-full flex-col gap-2 rounded-2xl border border-base-content/20 bg-base-100/85 p-4 shadow-2xl"
  >
    <div class="flex shrink-0 items-center px-0.5 pt-0.5 pb-1">
      <span class="badge badge-outline badge-primary">{badge}</span>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      {@render children()}
    </div>
  </div>
</div>
