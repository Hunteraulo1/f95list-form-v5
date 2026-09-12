<script lang="ts">
	import type { LucideIcon } from "@lucide/svelte";
	import type { ClassValue } from "svelte/elements";
	import { page } from "$app/state";
	import { cn } from "$lib/utils/cn";

	export interface Item {
		label: string;
		icon: LucideIcon;
		href: string;
		permission?: string;
		class?: ClassValue;
	}

	interface Props {
		items: Item[];
	}

	const { items }: Props = $props();
</script>

<ul class="w-64 h-full max-w-full flex flex-col gap-2 p-2">
	{#each items as item}
		{@const active = page.url.pathname === item.href}
		{@const Icon = item.icon}
		<li>
			<a
				href={item.href}
				class={cn(
					"flex items-center gap-2 p-2 rounded-lg hover:bg-base-100",
					item.class,
				)}
				class:bg-base-300={active}
			>
				<Icon />
				{item.label}
			</a>
		</li>
	{/each}
</ul>
