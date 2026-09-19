<script lang="ts">
import type { ClassValue } from 'clsx';
import type { Snippet } from 'svelte';
import { cn } from '$lib/utils/cn';
import Button from '../Button.svelte';

interface ButtonType {
  label: string;
  href: string;
  external?: boolean;
}

interface Props {
  children?: Snippet;
  title: string;
  description: string;
  buttons: ButtonType[];
  classes?: ClassValue;
  masterClasses?: ClassValue;
}

const { children, title, description, buttons, classes, masterClasses }: Props =
  $props();
</script>

<div
  class={cn(
  'relative z-0 px-8 py-4 w-full h-full rounded-xl bg-base-300 min-h-60 lg:grid lg:grid-cols-2',
  masterClasses,
)}
>
  <div class="flex flex-col gap-4 justify-center p-8 h-full">
    <h4 class="text-4xl font-bold">{title}</h4>
    <p class="text-xl">{description}</p>
    <div class="flex gap-2">
      {#each buttons as { href, label }, index}
        <a {href}>
          <Button {label} inline={index > 0} />
        </a>
      {/each}
    </div>
  </div>
  <div class={cn('w-full h-full', classes)}>
    {@render children?.()}
  </div>
</div>
