<script lang="ts">
import type { LucideIcon } from '@lucide/svelte';
import type { ClassValue } from 'svelte/elements';
import { page } from '$app/state';
import { cn } from '$lib/utils/cn';

export interface Item {
  label: string;
  icon: LucideIcon;
  href: string;
  permission?: string;
  class?: ClassValue;
}

interface Props {
  items: Item[];
}

const { items }: Props = $props();
</script>

<ul class="flex h-full w-64 max-w-full flex-col gap-2 p-2">
  {#each items as item}
    <li>
      <a
        href={item.href}
        class={cn('flex items-center gap-2 rounded-lg p-2 hover:bg-base-100', item.class)}
        class:bg-base-300={page.url.pathname === item.href}
      >
        <item.icon />
        {item.label}
      </a>
    </li>
  {/each}
</ul>
