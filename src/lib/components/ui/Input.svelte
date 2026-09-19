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
  'shadow-mini inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border-2 border-transparent px-4 text-sm font-bold text-primary transition-all hover:border-primary',
  inline ? inlineStyle : classicStyle,
  classes,
)}
  {value}
  {placeholder}
  {oninput}
>
