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
  'bg-base-300 min-h-60 rounded-xl py-4 px-8 lg:grid lg:grid-cols-2 w-full h-full relative z-0',
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
