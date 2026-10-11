<script lang="ts">
import type { PageData } from './$types';

interface Props {
  data: PageData;
}

const { data }: Props = $props();
</script>

<div class="flex flex-col gap-4">
  <section class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <h2 class="font-bold">Liens utiles</h2>
      {#if data.canManageLinks}
        <a href="/admin/settings" class="text-sm underline">Modifier</a>
      {/if}
    </div>

    {#if data.links.length > 0}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        {#each data.links as link (link.id)}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="relative flex items-center justify-between rounded-xl bg-base-100 p-4 hover:bg-base-300"
          >
            <div class="min-w-0">
              <h3 class="truncate font-bold">{link.label}</h3>
              {#if link.description}
                <p class="truncate">{link.description}</p>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    {:else}
      <p class="rounded-xl bg-base-100 p-4 text-sm opacity-70">
        Aucun lien pour l'instant.
        {#if data.canManageLinks}
          Ajoute-en depuis les paramètres de l'administration.
        {/if}
      </p>
    {/if}
  </section>
</div>
