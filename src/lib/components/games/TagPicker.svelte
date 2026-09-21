<script lang="ts">
import { X } from '@lucide/svelte';
import { cn } from '$lib/utils/cn';

interface Tag {
  id: number;
  name: string;
}

interface Props {
  tags: Tag[];
  selected: number[];
  //? Nom des champs envoyés avec le formulaire (un par tag choisi).
  name?: string;
  invalid?: boolean;
}

let {
  tags,
  selected = $bindable([]),
  name = 'tags',
  invalid = false,
}: Props = $props();

let search = $state('');

const byId = $derived(new Map(tags.map((tag) => [tag.id, tag])));
const chosen = $derived(selected.flatMap((id) => byId.get(id) ?? []));
const matches = $derived(
  tags.filter(
    (tag) =>
      !selected.includes(tag.id) &&
      tag.name.toLowerCase().includes(search.trim().toLowerCase()),
  ),
);

const toggle = (id: number) => {
  selected = selected.includes(id)
    ? selected.filter((candidate) => candidate !== id)
    : [...selected, id];
};
</script>

<div
  class={cn(
  'flex flex-col gap-2 rounded-xl border-2 border-base-content/30 bg-base-100 p-3',
  invalid && 'border-error',
)}
>
  {#if chosen.length > 0}
    <ul class="flex flex-wrap gap-1" aria-label="Tags choisis">
      {#each chosen as tag (tag.id)}
        <li>
          <button
            type="button"
            class="flex cursor-pointer items-center gap-1 rounded-lg bg-primary px-2 py-0.5 text-xs font-bold text-neutral-content"
            title="Retirer « {tag.name} »"
            onclick={() => toggle(tag.id)}
          >
            {tag.name}
            <X size="12" aria-hidden="true" />
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-xs opacity-60">Aucun tag choisi.</p>
  {/if}

  <input
    type="search"
    class="shadow-mini h-8 w-full rounded-xl border-2 border-transparent bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary"
    placeholder="Rechercher un tag…"
    aria-label="Rechercher un tag"
    bind:value={search}
    onkeydown={(event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (matches[0]) toggle(matches[0].id);
  }
}}
  >

  <ul
    class="flex max-h-40 flex-wrap gap-1 overflow-y-auto"
    aria-label="Tags disponibles"
  >
    {#each matches as tag (tag.id)}
      <li>
        <button
          type="button"
          class="cursor-pointer rounded-lg border border-base-content/30 px-2 py-0.5 text-xs hover:bg-base-200"
          onclick={() => toggle(tag.id)}
        >
          {tag.name}
        </button>
      </li>
    {:else}
      <li class="text-xs opacity-60">Aucun tag ne correspond.</li>
    {/each}
  </ul>

  {#each selected as id (id)}
    <input type="hidden" {name} value={id}>
  {/each}
</div>
