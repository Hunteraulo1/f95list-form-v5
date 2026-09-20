<script lang="ts">
import { Ellipsis, type LucideIcon } from '@lucide/svelte';
import { DropdownMenu } from 'bits-ui';
import { cn } from '$lib/utils/cn';

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  //? Action destructrice ou qui coupe quelque chose : affichée en rouge.
  danger?: boolean;
  //? Entrée grisée et non sélectionnable ; `title` peut en expliquer la raison.
  disabled?: boolean;
  title?: string;
  onselect: () => void;
}

interface Props {
  items: MenuItem[];
  label?: string;
}

const { items, label = "Plus d'actions" }: Props = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    aria-label={label}
    title={label}
    class="shadow-mini inline-flex size-5 cursor-pointer items-center justify-center rounded-xl border-2 border-base-content text-base-content transition-all hover:border-transparent hover:bg-primary hover:text-neutral-content data-[state=open]:bg-primary data-[state=open]:text-neutral-content"
  >
    <Ellipsis size="14" />
  </DropdownMenu.Trigger>

  <DropdownMenu.Portal>
    <DropdownMenu.Content
      align="end"
      sideOffset={6}
      class="shadow-mini z-50 min-w-48 rounded-xl border-2 border-base-content bg-base-100 p-1 text-base-content outline-hidden"
    >
      {#each items as item (item.label)}
        <DropdownMenu.Item
          onSelect={item.onselect}
          disabled={item.disabled}
          title={item.title}
          class={cn(
  'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold outline-hidden select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-base-200',
  item.danger && 'text-error',
)}
        >
          {#if item.icon}
            <item.icon size="16" />
          {/if}
          {item.label}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
