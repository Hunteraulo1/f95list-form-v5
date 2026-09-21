<script lang="ts">
import { enhance } from '$app/forms';
import Button from '$lib/components/ui/Button.svelte';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

let checked = $state<string[]>([]);
let submitting = $state(false);

const allChecked = $derived(
  data.rules.every((rule) => checked.includes(rule.id)),
);
const accepted = $derived(Boolean(form && 'accepted' in form && form.accepted));
const error = $derived(form && 'error' in form ? form.error : null);
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-4 p-2">
  <h1 class="py-4 text-center text-xl font-bold">Devenir traducteur</h1>

  {#if accepted}
    <div
      class="flex flex-col items-center gap-3 rounded-xl bg-base-100 p-6 text-center"
    >
      <p class="font-bold">Bienvenue parmi les traducteurs !</p>
      <p class="text-sm opacity-70">
        Ton compte a maintenant le rôle « {data.translatorLabel} » : tu peux
        ajouter des jeux et des traductions.
      </p>
      <a href="/dashboard/games/new">
        <Button label="Ajouter un jeu" />
      </a>
    </div>
  {:else if !data.eligible}
    <p class="rounded-xl bg-base-100 p-6 text-center text-sm">
      Ton rôle actuel (« {data.roleLabel} ») est déjà égal ou supérieur à «
      {data.translatorLabel}
      » : il n'y a rien à demander.
    </p>
  {:else}
    <p class="text-center text-sm opacity-70">
      Pour proposer des traductions, lis ces règles et accepte-les une à une.
      Ton compte passera aussitôt au rôle « {data.translatorLabel} ».
    </p>

    <form
      method="POST"
      action="?/accept"
      class="flex flex-col gap-3"
      use:enhance={() => {
  submitting = true;
  return async ({ update }) => {
    await update({ reset: false });
    submitting = false;
  };
}}
    >
      <ul class="flex flex-col gap-3">
        {#each data.rules as rule (rule.id)}
          <li class="rounded-xl bg-base-100 p-4">
            <label class="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="rules"
                value={rule.id}
                class="mt-1 size-6 shrink-0 cursor-pointer"
                bind:group={checked}
              >
              <span>
                <span class="block font-bold">{rule.title}</span>
                <span class="block text-sm opacity-80">{rule.text}</span>
              </span>
            </label>
          </li>
        {/each}
      </ul>

      {#if error}
        <p class="text-sm font-bold text-error">{error}</p>
      {/if}

      <div class="flex justify-center">
        <Button
          label={submitting ? 'Envoi…' : "J'accepte les règles et je deviens traducteur"}
          type="submit"
          disabled={!allChecked || submitting}
          title={allChecked ? undefined : 'Coche toutes les règles pour continuer.'}
        />
      </div>
    </form>
  {/if}
</div>
