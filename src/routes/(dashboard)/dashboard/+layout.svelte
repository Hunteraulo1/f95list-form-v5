<script lang="ts">
	import {
		BrickWallShield,
		Languages,
		LayoutDashboard,
		UserPen,
	} from "@lucide/svelte";
	import type { Snippet } from "svelte";
	import type { Item } from "$lib/components/ui/dashboard/Sidebar.svelte";
	import Sidebar from "$lib/components/ui/dashboard/Sidebar.svelte";

	interface Props {
		children: Snippet;
	}

	const { children }: Props = $props();

	const items: Item[] = [
		{
			label: "Tableau de bord",
			icon: LayoutDashboard,
			href: "/dashboard",
		},
		{
			label: "Mes traductions",
			icon: Languages,
			href: "/dashboard/translates",
		},
		{
			label: "Ma page",
			icon: UserPen,
			href: "/profile",
		},
		{
			label: "Administration",
			icon: BrickWallShield,
			href: "/admin",
			permission: "manage.game",
		},
	];
</script>

<Sidebar {items} />
<div class="w-full h-full">
	{@render children()}
</div>
