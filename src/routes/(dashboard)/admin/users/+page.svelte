<script lang="ts">
	import { faker } from "@faker-js/faker";
	import { ArrowDownAZ, ArrowUpAZ } from "@lucide/svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import { cn } from "$lib/utils/cn";

	type SortKey = "name" | "rank" | "createdAt";

	const columns: { label: string; key: SortKey | null }[] = [
		{ label: "Nom", key: "name" },
		{ label: "Rang", key: "rank" },
		{ label: "Inscrit le", key: "createdAt" },
		{ label: "Actions", key: null },
	];

	const items = $state([
		{
			id: "1",
			name: "Hunteraulo",
			image: "https://cdn.discordapp.com/avatars/521092563042828297/84a0e6cc5576d6395643c8d32e8a2c75.webp?size=256",
			rank: "Super admin",
			banner: null,
			description: "Salut les boys !",
			createdAt: faker.date.recent(),
		},
		{
			id: "2",
			name: "Rory",
			image: "https://cdn.discordapp.com/avatars/521092563042828297/84a0e6cc5576d6395643c8d32e8a2c75.webp?size=256",
			rank: "Super admin",
			banner: null,
			description: "Salut les girls !",
			createdAt: faker.date.recent(),
		},
		{
			id: "3",
			name: "Le Chat",
			image: "https://cdn.discordapp.com/avatars/521092563042828297/84a0e6cc5576d6395643c8d32e8a2c75.webp?size=256",
			rank: "Sys admin",
			banner: null,
			description: "Salut les chats !",
			createdAt: faker.date.recent(),
		},
	]);

	let search = $state("");
	let sortKey = $state<SortKey | null>("name");
	let sortAsc = $state(true);

	function sortBy(key: SortKey | null) {
		if (!key) return;
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = true;
		}
	}

	const filteredItems = $derived.by(() => {
		const query = search.trim().toLowerCase();

		const filtered = query
			? items.filter((item) => item.name.toLowerCase().includes(query))
			: items;

		return [...filtered].sort((a, b) => {
			if (!sortKey) return 0;

			const valueA = a[sortKey];
			const valueB = b[sortKey];

			const cmp =
				valueA instanceof Date && valueB instanceof Date
					? valueA.getTime() - valueB.getTime()
					: String(valueA).localeCompare(String(valueB));

			return sortAsc ? cmp : -cmp;
		});
	});
</script>

<div class="rounded-xl p-2 flex flex-col relative">
	<h3 class="py-4 text-center font-bold text-xl">Utilisateurs:</h3>

	<div class="flex justify-end my-4">
		<Input
			placeholder="Rechercher un nom..."
			value={search}
			oninput={(e) => (search = e.currentTarget.value)}
		/>
	</div>

	<table class="table-fixed w-full border-spacing-2">
		<thead>
			<tr>
				{#each columns as { label, key }}
					<th
						scope="col"
						class={cn("select-none", key && "cursor-pointer")}
						onclick={() => sortBy(key)}
					>
						<span class="flex justify-center items-center gap-2">
							{label}
							{#if key && sortKey === key}
								{#if sortAsc}
									<ArrowDownAZ size="16" />
								{:else}
									<ArrowUpAZ size="16" />
								{/if}
							{/if}
						</span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each filteredItems as item (item.id)}
				<tr
					class="border-collapse even:bg-base-300 odd:bg-base-100 relative"
				>
					<td class="py-2 px-4 font-bold">{item.name}</td>
					<td class="py-2 px-4 text-center">{item.rank}</td>
					<td class="py-2 px-4 text-center">
						{new Date(item.createdAt).toLocaleString("fr")}
					</td>
					<td class="py-3 px-4 flex justify-center gap-2">
						<Button label="Modifier" size="tiny" />
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
