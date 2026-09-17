<script lang="ts">
	import { Check, ChevronDown, Minus } from "@lucide/svelte";
	import {
		type GamesFilterGroupState,
		gamesFilterGroupSummary,
	} from "$lib/games/games-filter";
	import { cn } from "$lib/utils/cn.js";

	interface Props {
		group: GamesFilterGroupState;
		onToggle: (value: string) => void;
	}

	const { group, onToggle }: Props = $props();

	let details: HTMLDetailsElement | undefined = $state();
	const summary = $derived(gamesFilterGroupSummary(group));
	const hasSelection = $derived(group.values.some((v) => v.checked));

	const closeOnOutsideClick = (event: MouseEvent) => {
		if (details && !details.contains(event.target as Node)) {
			details.open = false;
		}
	};
</script>

<svelte:window onclick={closeOnOutsideClick} />

<details bind:this={details} class="relative w-full">
	<summary
		class={cn(
			"list-none rounded-lg text-xs font-bold px-3 py-2 flex items-center gap-1.5 cursor-pointer transition-all select-none",
			hasSelection
				? "bg-primary text-primary-content"
				: "bg-base-200 hover:bg-base-300",
		)}
	>
		<span class="truncate max-w-40">{summary}</span>
		<ChevronDown class="size-3.5 shrink-0 opacity-70" />
	</summary>

	<ul
		class="max-h-64 w-full overflow-y-auto rounded-lg bg-base-100 shadow-lg p-1 flex flex-col gap-0.5"
	>
		{#each group.values as entry (entry.value)}
			<li>
				<button
					type="button"
					class="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-base-200 cursor-pointer"
					onclick={() => onToggle(entry.value)}
				>
					<span
						class="flex size-3.5 shrink-0 items-center justify-center"
					>
						{#if entry.checked}
							{#if entry.inverse}
								<Minus class="size-3.5 text-error" />
							{:else}
								<Check class="size-3.5 text-success" />
							{/if}
						{/if}
					</span>
					<span class="truncate">{entry.label}</span>
				</button>
			</li>
		{/each}
	</ul>
</details>
