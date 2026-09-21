<script lang="ts">
import { X } from '@lucide/svelte';
import { newUserRef, userRef } from '$lib/games/game-form';

export interface PickedUser {
  //? `user:<id>` (compte existant) ou `new:<nom>` (compte fantôme à créer).
  ref: string;
  label: string;
  isNew?: boolean;
}

interface Found {
  id: string;
  name: string;
  slug: string;
  ghost: boolean;
}

interface Props {
  //? Nom du champ envoyé avec le formulaire (un par personne choisie).
  name: string;
  value: PickedUser[];
  //? Seul le staff peut créer un compte pour un nom inconnu.
  canCreate?: boolean;
  placeholder?: string;
  invalid?: boolean;
}

let {
  name,
  value = $bindable([]),
  canCreate = false,
  placeholder = 'Rechercher un compte…',
  invalid = false,
}: Props = $props();

let query = $state('');
let found = $state<Found[]>([]);
let open = $state(false);

const term = $derived(query.trim());
const exact = $derived(
  found.some((user) => user.name.toLowerCase() === term.toLowerCase()),
);

//? Recherche parmi les comptes pendant la saisie (annulée si la saisie continue).
$effect(() => {
  const search = term;

  if (!search) {
    found = [];
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(async () => {
    try {
      const response = await fetch(
        `/dashboard/games/new/users?q=${encodeURIComponent(search)}`,
        { signal: controller.signal },
      );
      found = (await response.json()).users;
    } catch {
      //? Saisie suivante ou réseau : la liste reste celle d'avant.
    }
  }, 200);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
});

const add = (person: PickedUser) => {
  if (!value.some((picked) => picked.ref === person.ref)) {
    value = [...value, person];
  }

  query = '';
  found = [];
  open = false;
};

const remove = (ref: string) => {
  value = value.filter((picked) => picked.ref !== ref);
};
</script>

<div class="flex flex-col gap-2">
  {#if value.length > 0}
    <ul class="flex flex-wrap gap-1">
      {#each value as person (person.ref)}
        <li>
          <button
            type="button"
            class="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold {person.isNew
  ? 'bg-warning text-warning-content'
  : 'bg-primary text-neutral-content'}"
            title="Retirer {person.label}"
            onclick={() => remove(person.ref)}
          >
            {person.label}
            {#if person.isNew}
              <span class="font-normal">(nouveau compte)</span>
            {/if}
            <X size="12" aria-hidden="true" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="relative">
    <input
      type="search"
      class="shadow-mini h-9 w-full rounded-xl border-2 bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary {invalid ? 'border-error' : 'border-transparent'}"
      {placeholder}
      aria-label={placeholder}
      autocomplete="off"
      bind:value={query}
      onfocus={() => (open = true)}
      onblur={() => setTimeout(() => (open = false), 150)}
      onkeydown={(event) => {
  if (event.key === 'Escape') open = false;
  if (event.key === 'Enter') {
    event.preventDefault();
    const first = found[0];
    if (first) add({ ref: userRef(first.id), label: first.name });
    else if (canCreate && term)
      add({ ref: newUserRef(term), label: term, isNew: true });
  }
}}
    >

    {#if open && term}
      <ul
        class="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border-2 border-base-content bg-base-100 p-1 text-sm shadow-lg"
      >
        {#each found as user (user.id)}
          <li>
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-base-200"
              onmousedown={(event) => event.preventDefault()}
              onclick={() => add({ ref: userRef(user.id), label: user.name })}
            >
              <span class="truncate font-bold">{user.name}</span>
              <span class="shrink-0 text-xs opacity-60">
                {user.ghost ? 'sans compte' : 'compte'}
                · /{user.slug}
              </span>
            </button>
          </li>
        {/each}

        {#if canCreate && !exact}
          <li>
            <button
              type="button"
              class="w-full cursor-pointer rounded-lg px-2 py-1 text-left hover:bg-base-200"
              onmousedown={(event) => event.preventDefault()}
              onclick={() => add({ ref: newUserRef(term), label: term, isNew: true })}
            >
              Créer « <span class="font-bold">{term}</span> » (compte fantôme)
            </button>
          </li>
        {:else if found.length === 0}
          <li class="px-2 py-1 opacity-60">Aucun compte ne correspond.</li>
        {/if}
      </ul>
    {/if}
  </div>

  {#each value as person (person.ref)}
    <input type="hidden" {name} value={person.ref}>
  {/each}
</div>
