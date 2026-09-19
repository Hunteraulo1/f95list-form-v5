<script lang="ts">
import { Dialog } from 'bits-ui';
import type { ClassValue } from 'clsx';
import type { Snippet } from 'svelte';
import { cn } from '$lib/utils/cn';

interface Props {
  open?: boolean;
  title: string;
  description?: string;
  classes?: ClassValue;
  size?: 'small' | 'normal' | 'big';
  closable?: boolean;
  onclose?: () => void;
  children?: Snippet;
  footer?: Snippet;
}

let {
  open = $bindable(false),
  title,
  description,
  classes,
  size = 'normal',
  closable = true,
  onclose,
  children,
  footer,
}: Props = $props();

const onOpenChange = (value: boolean) => {
  if (!value) onclose?.();
};
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
    <Dialog.Content
      interactOutsideBehavior={closable ? 'close' : 'ignore'}
      escapeKeydownBehavior={closable ? 'close' : 'ignore'}
      class={cn(
        'shadow-mini fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border-2 border-base-content bg-base-100 p-6 text-base-content outline-hidden',
        size === 'small' && 'max-w-sm',
        size === 'normal' && 'max-w-lg',
        size === 'big' && 'max-w-3xl',
        classes,
      )}
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <Dialog.Title class="text-lg font-bold">{title}</Dialog.Title>
          {#if description}
            <Dialog.Description class="text-sm opacity-70">
              {description}
            </Dialog.Description>
          {/if}
        </div>

        {#if closable}
          <Dialog.Close
            aria-label="Fermer"
            class="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-xl leading-none transition-all hover:bg-primary hover:text-neutral-content"
          >
            ×
          </Dialog.Close>
        {/if}
      </div>

      {#if children}
        <div class="overflow-y-auto">
          {@render children()}
        </div>
      {/if}

      {#if footer}
        <div class="flex flex-wrap justify-end gap-2">
          {@render footer()}
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
