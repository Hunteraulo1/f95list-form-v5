<script lang="ts">
import type { ClassValue } from 'clsx';
import { cn } from '$lib/utils/cn';

interface Props {
  label: string;
  classes?: ClassValue;
  inline?: boolean;
}

const { label, classes, inline = false }: Props = $props();

const inlineStyle =
  'border-base-content text-base-content hover:border-transparent';
const classicStyle = 'bg-base-content';
</script>

<button
	class={cn(
		"rounded-xl text-primary shadow-mini border-2 border-transparent inline-flex mx-auto h-12 items-center justify-center px-5.25 text-sm font-bold transition-all hover:bg-primary hover:text-base-content cursor-pointer",
		inline ? inlineStyle : classicStyle,
		classes,
	)}
>
	{label}
</button>
