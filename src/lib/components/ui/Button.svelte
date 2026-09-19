<script lang="ts">
import type { ClassValue } from 'clsx';
import type { MouseEventHandler } from 'svelte/elements';
import { cn } from '$lib/utils/cn';

interface Props {
  label: string;
  classes?: ClassValue;
  inline?: boolean;
  size?: 'tiny' | 'small' | 'normal' | 'big';
  type?: 'button' | 'submit' | 'reset';
  onclick?: MouseEventHandler<HTMLButtonElement>;
}

const {
  label,
  classes,
  inline = false,
  size = 'normal',
  type = 'button',
  onclick,
}: Props = $props();

const inlineStyle: ClassValue =
  'border-base-content text-base-content hover:border-transparent';
const classicStyle: ClassValue = 'bg-primary dark:bg-neutral-content ';
</script>

<button
  class={cn(
  'rounded-xl dark:text-primary border-2 cursor-pointer shadow-mini text-neutral-content border-transparent inline-flex items-center justify-center text-sm font-bold transition-all hover:bg-primary hover:text-neutral-content',
  inline ? inlineStyle : classicStyle,
  size === 'tiny' && 'h-5 min-h-5 px-2 text-[.75rem]',
  size === 'small' && 'h-6 min-h-6 px-3',
  size === 'normal' && 'h-9 min-h-9 px-4 uppercase',
  size === 'big' && 'h-12 min-h-12 px-5.25 uppercase',
  classes,
)}
  {type}
  {onclick}
>
  {label}
</button>
