<script lang="ts">
import type { ClassValue } from 'clsx';
import type { FormEventHandler } from 'svelte/elements';
import { cn } from '$lib/utils/cn';

interface Props {
  placeholder?: string;
  classes?: ClassValue;
  inline?: boolean;
  size?: 'tiny' | 'small' | 'normal' | 'big';
  oninput?: FormEventHandler<HTMLInputElement>;
  value?: string;
}

const {
  placeholder,
  classes,
  inline = false,
  oninput,
  value,
}: Props = $props();

const inlineStyle =
  'border-base-content text-base-content hover:border-transparent';
const classicStyle = 'bg-neutral-content';
</script>

<input
  class={cn(
  'inline-flex justify-center items-center px-4 h-9 text-sm font-bold rounded-xl border-2 border-transparent transition-all cursor-pointer text-primary shadow-mini hover:border-primary',
  inline ? inlineStyle : classicStyle,
  classes,
)}
  {value}
  {placeholder}
  {oninput}
>
