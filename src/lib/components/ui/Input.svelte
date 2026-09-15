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
		"rounded-xl text-primary shadow-mini border-2 border-transparent inline-flex items-center justify-center text-sm font-bold transition-all hover:border-primary cursor-pointer h-9 px-4",
		inline ? inlineStyle : classicStyle,
		classes,
	)}
	{value}
	{placeholder}
	{oninput}
/>
