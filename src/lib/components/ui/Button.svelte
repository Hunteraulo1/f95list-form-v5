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
const classicStyle: ClassValue = 'bg-primary dark:bg-neutral-content';
</script>

<button
  class={cn(
  'inline-flex justify-center items-center text-sm font-bold rounded-xl border-2 border-transparent transition-all cursor-pointer dark:text-primary shadow-mini text-neutral-content hover:bg-primary hover:text-neutral-content',
  inline ? inlineStyle : classicStyle,
  size === 'tiny' && 'px-2 h-5 min-h-5 text-[.75rem]',
  size === 'small' && 'px-3 h-6 min-h-6',
  size === 'normal' && 'px-4 h-9 uppercase min-h-9',
  size === 'big' && 'h-12 uppercase min-h-12 px-5.25',
  classes,
)}
  {type}
  {onclick}
>
  {label}
</button>
