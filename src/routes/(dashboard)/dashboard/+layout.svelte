<script lang="ts">
import {
  BrickWallShield,
  GraduationCap,
  KeyRound,
  Languages,
  LayoutDashboard,
  LogOut,
  Settings,
  UserPen,
} from '@lucide/svelte';
import type { Snippet } from 'svelte';
import type { Item } from '$lib/components/ui/dashboard/Sidebar.svelte';
import Sidebar from '$lib/components/ui/dashboard/Sidebar.svelte';
import type { LayoutData } from './$types';

interface Props {
  data: LayoutData;
  children: Snippet;
}

const { data, children }: Props = $props();

const items = $derived<Item[]>([
  {
    label: 'Administration',
    icon: BrickWallShield,
    href: '/admin',
    permission: 'admin.access',
  },
  {
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    label: 'Mes traductions',
    icon: Languages,
    href: '/dashboard/translates',
    hidden: !data.hasTranslations,
  },
  {
    label: 'Devenir traducteur',
    icon: GraduationCap,
    href: '/dashboard/become-translator',
    //? Proposé aux rôles plus faibles que traducteur (même règle que la page).
    hidden: !data.canBecomeTranslator,
  },
  {
    label: 'Ma page',
    icon: UserPen,
    href: '/profile',
  },
  {
    label: 'Clés API',
    icon: KeyRound,
    href: '/dashboard/api',
  },
  {
    label: 'Paramètres',
    icon: Settings,
    href: '/dashboard/settings',
    permission: 'game.edit',
  },
  {
    label: 'Se déconnecter',
    icon: LogOut,
    href: '/logout',
    class: 'text-red-500 font-bold',
  },
]);
</script>

<Sidebar {items} />
<div class="h-full w-full">
  {@render children()}
</div>
