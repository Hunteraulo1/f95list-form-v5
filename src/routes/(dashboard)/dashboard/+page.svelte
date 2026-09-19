<script lang="ts">
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import { gameMatchesQuery } from '$lib/games/games-filter';
import type { TranslationStatus } from './+page.server';
import type { PageData } from './$types';

interface Props {
  data: PageData;
}
const { data }: Props = $props();

// TODO: Implémenter la valeurs des traductions oudated
let oudated = 5;
let unread = 0;

let query = $state('');
const results = $derived(
  query.trim()
    ? data.games.filter((game) => gameMatchesQuery(game, query)).slice(0, 20)
    : [],
);

const translationStatusLabel = (status: TranslationStatus) => {
  switch (status) {
    case 'up_to_date':
      return 'À jour';
    case 'outdated':
      return 'Pas à jour';
    case 'none':
      return 'Non traduit';
  }
};
</script>

<div class="flex flex-col gap-4">
  <section class="grid grid-cols-2 gap-4">
    <a
      href="/dashboard/translates"
      class="relative flex items-center justify-between rounded-xl bg-base-100 p-4"
    >
      <div>
        <h2 class="font-bold">Mes traduction plus à jour</h2>
        <p>Accèder aux traductions</p>
      </div>
      <span
        class="text-4xl font-black"
        class:text-gray-500={oudated === 0}
        class:text-yellow-500={oudated < 5 && oudated > 0}
        class:text-red-500={oudated >= 5}
      >
        {oudated}
      </span>
    </a>
    <a
      href="/dashboard/translates"
      class="relative flex items-center justify-between rounded-xl bg-base-100 p-4"
    >
      <div>
        <h2 class="font-bold">Mes message non lu</h2>
        <p>Accèder aux messages</p>
      </div>
      <span
        class="text-4xl font-black"
        class:text-gray-500={unread === 0}
        class:text-red-500={unread > 0}
      >
        {unread}
      </span>
    </a>
  </section>

  <section class="flex flex-col gap-2 rounded-xl bg-base-100 p-4">
    <h2 class="font-bold">Rechercher un jeu</h2>
    <div class="flex gap-2">
      <Input
        classes="w-full"
        size="big"
        placeholder="Rechercher un nom ou un n° de thread"
        value={query}
        oninput={(e) => {
  query = e.currentTarget.value;
}}
      />
      <Button label="Ajouter un jeu" classes="w-50" inline />
    </div>
    {#if query.trim()}
      <div class="mt-2 flex flex-col gap-1">
        {#each results as game (game.id)}
          <a
            href={`/games/${game.id}`}
            class="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-base-200"
          >
            <span class="flex min-w-0 items-center gap-2">
              <img
                src={game.image}
                loading="lazy"
                alt={game.name}
                class="size-10 shrink-0 rounded-lg bg-base-200 object-cover"
              >
              <span class="truncate">{game.name}</span>
            </span>
            <span
              class="shrink-0 rounded-lg px-2 py-1 text-xs font-bold uppercase"
              class:bg-success={game.translationStatus === 'up_to_date'}
              class:text-success-content={game.translationStatus === 'up_to_date'}
              class:bg-warning={game.translationStatus === 'outdated'}
              class:text-warning-content={game.translationStatus === 'outdated'}
              class:bg-error={game.translationStatus === 'none'}
              class:text-error-content={game.translationStatus === 'none'}
            >
              {translationStatusLabel(game.translationStatus)}
            </span>
          </a>
        {:else}
          <p class="px-3 py-2 text-sm opacity-60">
            Aucun jeu ne correspond à la recherche.
          </p>
        {/each}
      </div>
    {/if}
  </section>
</div>
