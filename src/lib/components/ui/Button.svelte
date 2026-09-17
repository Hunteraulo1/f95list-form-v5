<script lang="ts">
import type { ClassValue } from 'clsx';
import type { MouseEventHandler } from 'svelte/elements';
import { cn } from '$lib/utils/cn';

interface Props {
  label: string;
  classes?: ClassValue;
  inline?: boolean;
  size?: 'tiny' | 'small' | 'normal' | 'big';
  onclick?: MouseEventHandler<HTMLButtonElement>;
}

const {
  label,
  classes,
  inline = false,
  size = 'normal',
  onclick,
}: Props = $props();

const inlineStyle =
  'border-base-content text-base-content hover:border-transparent';
const classicStyle = 'bg-neutral-content';
</script>

<button
	class={cn(
		"rounded-xl text-primary shadow-mini border-2 border-transparent inline-flex items-center justify-center text-sm font-bold transition-all hover:bg-primary hover:text-neutral-content cursor-pointer",
		inline ? inlineStyle : classicStyle,
		size === "tiny" && "h-5 min-h-5 px-2 text-[.75rem]",
		size === "small" && "h-6 min-h-6 px-3",
		size === "normal" && "h-9 min-h-9 px-4 uppercase",
		size === "big" && "h-12 min-h-12 px-5.25 uppercase",
		classes,
	)}
	{onclick}
>
	{label}
</button>
