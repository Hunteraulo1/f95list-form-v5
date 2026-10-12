<script lang="ts">
import { Inbox } from '@lucide/svelte';
import Button from '#lib/components/ui/Button.svelte';
import { cn } from '#lib/utils/cn.ts';
import { enhance } from '$app/forms';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

type Submission = PageData['mine'][number];

const STATUS = {
  pending: { label: 'En attente', class: 'bg-warning text-black' },
  accepted: { label: 'Acceptée', class: 'bg-success text-black' },
  rejected: { label: 'Refusée', class: 'bg-error text-black' },
} as const;

const fieldStyle =
  'shadow-mini min-h-16 w-full resize-y rounded-xl border-2 border-transparent bg-neutral-content px-3 py-2 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';

const error = $derived(form && 'message' in form ? form.message : null);

const date = (value: Date) =>
  new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
</script>

<div class="flex flex-col gap-6 p-2">
  <h3 class="pt-2 text-xl font-bold">Soumissions de jeux</h3>

  {#if error}
    <p
      class="rounded-xl bg-error/20 p-3 text-sm font-bold text-error"
      role="alert"
    >
      {error}
    </p>
  {:else if data.submitted}
    <p class="rounded-xl bg-success/20 p-3 text-sm font-bold" role="status">
      Jeu soumis : il sera ajouté au site une fois accepté par l'équipe.
    </p>
  {/if}

  {#if data.reviewer}
    <section class="flex flex-col gap-3">
      <h4 class="font-bold">À traiter ({data.pending.length})</h4>
      {#each data.pending as submission (submission.id)}
        {@render card(submission, true)}
      {:else}
        {@render empty('Aucune soumission en attente.')}
      {/each}
    </section>
  {/if}

  <section class="flex flex-col gap-3">
    <h4 class="font-bold">Mes soumissions ({data.mine.length})</h4>
    {#each data.mine as submission (submission.id)}
      {@render card(submission, false)}
    {:else}
      {@render empty("Vous n'avez soumis aucun jeu.")}
    {/each}
  </section>
</div>

{#snippet empty(
  text: string,
)}
  <div class="flex flex-col items-center gap-2 rounded-xl bg-base-100 py-8">
    <Inbox size="48" opacity=".2" />
    <p class="text-sm opacity-60">{text}</p>
  </div>
{/snippet}

{#snippet line(
  label: string,
  value: string,
)}
  <div class="flex gap-2">
    <dt class="shrink-0 font-bold">{label} :</dt>
    <dd class="min-w-0 wrap-break-word">{value}</dd>
  </div>
{/snippet}

<!-- `review` : la carte est dans la liste à traiter, avec ses boutons Accepter / Refuser. -->
{#snippet card(
  submission: Submission,
  review: boolean,
)}
  {@const { game, edition, translation } = submission}
  <article class="flex flex-col gap-3 rounded-xl bg-base-100 p-4">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="flex min-w-0 flex-col">
        <span class="font-bold wrap-break-word">{game.name}</span>
        <span class="text-xs opacity-70">
          {#if review}
            Soumis par
            <a href="/profile/{submission.author.slug}" class="underline">
              {submission.author.name}
            </a>
          {:else}
            Soumis
          {/if}
          le
          {date(submission.createdAt)}
        </span>
      </div>
      <span
        class={cn(
          'shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold',
          STATUS[submission.status].class,
        )}
      >
        {STATUS[submission.status].label}
      </span>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row">
      {#if game.image}
        <img
          src={game.image}
          alt=""
          loading="lazy"
          class="h-28 w-full shrink-0 rounded-lg bg-base-200 object-cover sm:w-48"
        >
      {/if}
      <dl class="flex min-w-0 flex-col gap-1 text-sm">
        <div class="flex gap-2">
          <dt class="shrink-0 font-bold">{game.origin} :</dt>
          <dd class="min-w-0 truncate">
            <a
              href={game.link}
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >
              {game.link}
            </a>
          </dd>
        </div>
        {@render line(
          'Édition',
          `${edition.name ?? 'Édition de base'} — ${edition.version} · ${edition.status}`,
        )}
        {@render line(
          'Traduction',
          [translation.type, translation.quality, translation.version]
            .filter(Boolean)
            .join(' · '),
        )}
        {#if translation.link}
          {@render line('Lien de la traduction', translation.link)}
        {/if}
        {#if translation.translators.length > 0}
          {@render line('Traducteur', translation.translators.join(', '))}
        {/if}
        {#if translation.proofreaders.length > 0}
          {@render line('Relecteur', translation.proofreaders.join(', '))}
        {/if}
        {#if game.tags.length > 0}
          {@render line('Tags', game.tags.join(', '))}
        {/if}
      </dl>
    </div>

    {#if game.description}
      <details class="text-sm">
        <summary class="cursor-pointer font-bold">Description</summary>
        <p class="mt-1 whitespace-pre-line opacity-80">{game.description}</p>
      </details>
    {/if}

    {#if submission.status !== 'pending'}
      <p class="text-sm opacity-80">
        {STATUS[submission.status].label}
        {#if submission.reviewer}
          par
          {submission.reviewer}
        {/if}
        {#if submission.note}
          : «
          {submission.note}
          »
        {/if}
      </p>
      {#if submission.gameId !== null}
        <a href="/games/{submission.gameId}" class="w-fit text-sm underline">
          Voir la fiche du jeu
        </a>
      {/if}
    {:else if review}
      <form method="POST" class="flex flex-col gap-2" use:enhance>
        <input type="hidden" name="id" value={submission.id}>
        <label class="flex flex-col gap-1 text-sm font-bold">
          Message pour l'auteur (optionnel)
          <textarea
            class={fieldStyle}
            name="note"
            maxlength={data.noteMaxLength}
          ></textarea>
        </label>
        <div class="flex flex-wrap gap-2">
          <!-- Le jeu est créé tel que soumis ; il se corrige ensuite depuis sa fiche. -->
          <button
            type="submit"
            formaction="?/accept"
            class="shadow-mini h-9 cursor-pointer rounded-xl bg-primary px-4 text-sm font-bold text-neutral-content dark:bg-neutral-content dark:text-primary"
          >
            Accepter et créer le jeu
          </button>
          <button
            type="submit"
            formaction="?/reject"
            class="cursor-pointer rounded-xl border-2 border-error px-4 text-sm font-bold text-error hover:bg-error hover:text-black"
          >
            Refuser
          </button>
        </div>
      </form>
    {:else}
      <form
        method="POST"
        action="?/cancel"
        use:enhance={({ cancel }) => {
          if (!confirm(`Retirer la soumission de « ${game.name} » ?`)) cancel();
        }}
      >
        <input type="hidden" name="id" value={submission.id}>
        <Button
          label="Retirer ma soumission"
          type="submit"
          inline
          size="small"
        />
      </form>
    {/if}
  </article>
{/snippet}
