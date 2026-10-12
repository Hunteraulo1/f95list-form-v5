<script lang="ts">
import type { ClassValue } from 'clsx';
import { roleBadgeClass } from '#lib/role-style.ts';
import { cn } from '#lib/utils/cn.ts';

interface Props {
  label: string;
  //? Style du rôle (`role.badge_style`) ; une valeur inconnue donne le style par défaut.
  style: string;
  class?: ClassValue;
}

const { label, style, class: className }: Props = $props();
</script>

<span
  class={cn(
    'inline-block max-w-full truncate rounded-lg border px-2 py-0.5 text-xs font-bold',
    roleBadgeClass(style),
    className,
  )}
>
  {label}
</span>
