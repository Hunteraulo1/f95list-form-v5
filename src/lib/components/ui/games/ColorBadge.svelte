<script lang="ts">
import type { ClassValue } from 'clsx';
import type { GameTranslation } from '$lib/server/db';
import { cn } from '$lib/utils/cn';

interface Props {
  item: GameTranslation['quality'] | GameTranslation['type'];
  label: string;
}

const { item, label }: Props = $props();

const styles: Partial<Record<Props['item'], ClassValue>> = {
  'full-proofreading': 'bg-success text-success-content',
  'original-french': 'bg-success text-success-content',
  'partial-proofreading': 'bg-warning text-warning-content',
  automatic: 'bg-orange-400 text-warning-content',
  'not-working': 'bg-error text-error-content',

  integrated: 'bg-success text-success-content',
  translation_with_mods: 'bg-info text-info-content',
  mods: 'bg-warning text-warning-content',
  no_translation: 'bg-error text-error-content',
};
</script>

<span
  class={cn(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
  (item && styles[item]) || 'bg-base-300 text-base-content',
)}
>
  {label}
</span>
