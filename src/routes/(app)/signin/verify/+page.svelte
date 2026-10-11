<script lang="ts">
import type { PageData } from './$types';

interface Props {
  data: PageData;
}

const { data }: Props = $props();
</script>

<div class="mx-auto flex max-w-md flex-col gap-4">
  <h1 class="py-4 text-center text-xl font-bold">Vérification de l'e-mail</h1>

  <p class="rounded-xl bg-base-100 p-6 text-center text-sm" role="status">
    {#if data.verified}
      Ton adresse e-mail est confirmée.
    {:else}
      Ce lien de vérification est invalide ou a expiré. Tu peux en demander un
      nouveau en ressaisissant ton adresse dans tes paramètres.
    {/if}
  </p>
</div>
