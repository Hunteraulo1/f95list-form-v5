<script lang="ts">
import { ChartSpline, LayoutDashboard, Users } from '@lucide/svelte';
import type { Snippet } from 'svelte';
import type { Item } from '$lib/components/ui/dashboard/Sidebar.svelte';
import Sidebar from '$lib/components/ui/dashboard/Sidebar.svelte';

interface Props {
  children: Snippet;
}

const { children }: Props = $props();

const items: Item[] = [
  {
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    label: 'Statistiques',
    icon: ChartSpline,
    href: '/admin',
  },
  {
    label: 'Utilisateurs',
    icon: Users,
    href: '/admin/users',
  },
];
</script>

<Sidebar {items} />
<div class="w-full h-full">
	{@render children()}
</div>
