<script lang="ts">
import {
  ArrowLeft,
  KeyRound,
  LayoutDashboard,
  Settings,
  Tags,
  Users,
} from '@lucide/svelte';
import type { Snippet } from 'svelte';
import type { Item } from '#lib/components/ui/dashboard/Sidebar.svelte';
import Sidebar from '#lib/components/ui/dashboard/Sidebar.svelte';

interface Props {
  children: Snippet;
}

const { children }: Props = $props();

const items: Item[] = [
  {
    label: 'Retour',
    icon: ArrowLeft,
    href: '/dashboard',
  },
  {
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    label: 'Utilisateurs',
    icon: Users,
    href: '/admin/users',
    permission: 'manage.users',
  },
  {
    label: 'Rôles',
    icon: Users,
    href: '/admin/roles',
    permission: 'manage.roles',
  },
  {
    label: 'Tags',
    icon: Tags,
    href: '/admin/tags',
    permission: 'manage.tags',
  },
  {
    label: 'Gestion API',
    icon: KeyRound,
    href: '/admin/api',
    permission: 'manage.api',
  },
  {
    label: 'Paramètres',
    icon: Settings,
    href: '/admin/settings',
    permission: 'manage.settings',
  },
];
</script>

<Sidebar {items} />
<div class="h-full w-full">
  {@render children()}
</div>
