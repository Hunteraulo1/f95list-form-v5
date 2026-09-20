<script lang="ts">
import Button from '$lib/components/ui/Button.svelte';

interface Props {
  as: string;
  role: string;
  from: string;
}

const { as, role, from }: Props = $props();
</script>

<div
  class="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-xl border-2 border-base-content bg-warning px-4 py-2 text-sm text-warning-content shadow-lg"
  role="status"
>
  <span>
    Vous naviguez en tant que <strong>{as}</strong> ({role}). Compte réel :
    {from}.
  </span>
  <form method="POST" action="/impersonation/stop">
    <Button label="Revenir à mon compte" type="submit" size="small" />
  </form>
</div>
