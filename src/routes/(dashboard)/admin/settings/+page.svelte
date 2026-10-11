<script lang="ts">
import { ArrowDown, ArrowUp } from '@lucide/svelte';
import {
  ADMIN_LINK_DESCRIPTION_MAX_LENGTH,
  ADMIN_LINK_LABEL_MAX_LENGTH,
  ADMIN_LINK_URL_MAX_LENGTH,
} from '#lib/admin-links.ts';
import Button from '#lib/components/ui/Button.svelte';
import { enhance } from '$app/forms';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

const fieldStyle =
  'shadow-mini h-9 w-full min-w-0 rounded-xl border-2 border-transparent bg-neutral-content px-4 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';
const iconButton =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-base-300 disabled:cursor-not-allowed disabled:opacity-30';

const errorOf = (id: string) =>
  form && 'message' in form && form.id === id ? form.message : null;
const savedOf = (id: string) =>
  Boolean(form && 'saved' in form && form.saved === id);
</script>

{#snippet fields(
  link: { label: string; description: string; url: string } | null,
)}
  <label class="flex flex-col gap-1 text-sm font-bold">
    Nom
    <input
      class={fieldStyle}
      type="text"
      name="label"
      value={link?.label ?? ''}
      maxlength={ADMIN_LINK_LABEL_MAX_LENGTH}
      placeholder="Ex : Zitadel"
      required
    >
  </label>
  <label class="flex flex-col gap-1 text-sm font-bold">
    Description
    <input
      class={fieldStyle}
      type="text"
      name="description"
      value={link?.description ?? ''}
      maxlength={ADMIN_LINK_DESCRIPTION_MAX_LENGTH}
      placeholder="Ex : Gestion des comptes"
    >
  </label>
  <label class="flex flex-col gap-1 text-sm font-bold md:col-span-2">
    Adresse
    <input
      class={fieldStyle}
      type="url"
      name="url"
      value={link?.url ?? ''}
      maxlength={ADMIN_LINK_URL_MAX_LENGTH}
      placeholder="https://…"
      required
    >
  </label>
{/snippet}

<div class="flex flex-col gap-4">
  <section class="flex flex-col gap-3 rounded-xl bg-base-100 p-4">
    <div class="flex flex-col gap-1">
      <h2 class="font-bold">Liens utiles</h2>
      <p class="text-sm opacity-70">
        Raccourcis affichés sur l'accueil de l'administration, dans cet ordre.
      </p>
    </div>

    {#each data.links as link, index (link.id)}
      <div class="flex gap-2 rounded-xl bg-base-200 p-4">
        <div class="flex flex-col justify-center gap-1">
          {#each [
            ['up', ArrowUp, 'Monter', index === 0],
            ['down', ArrowDown, 'Descendre', index === data.links.length - 1],
          ] as const as [direction, Icon, title, disabled] (direction)}
            <form method="POST" action="?/move" use:enhance>
              <input type="hidden" name="id" value={link.id}>
              <input type="hidden" name="direction" value={direction}>
              <button
                type="submit"
                class={iconButton}
                aria-label="{title} « {link.label} »"
                {title}
                {disabled}
              >
                <Icon size="16" aria-hidden="true" />
              </button>
            </form>
          {/each}
        </div>

        <div class="flex min-w-0 grow flex-col gap-3">
          <form
            method="POST"
            action="?/update"
            class="grid grid-cols-1 gap-3 md:grid-cols-2"
            use:enhance={() =>
              async ({ update }) => {
                await update({ reset: false });
              }}
          >
            <input type="hidden" name="id" value={link.id}>
            {@render fields(link)}

            {#if errorOf(link.id)}
              <p
                class="text-sm font-bold text-error md:col-span-2"
                role="alert"
              >
                {errorOf(link.id)}
              </p>
            {:else if savedOf(link.id)}
              <p
                class="text-sm font-bold text-success md:col-span-2"
                role="status"
              >
                Lien enregistré.
              </p>
            {/if}

            <div class="flex items-center justify-end gap-4 md:col-span-2">
              <!-- Même formulaire, autre action : seul l'identifiant du lien est lu. -->
              <button
                type="submit"
                formaction="?/delete"
                formnovalidate
                class="cursor-pointer text-sm font-bold text-error underline"
                onclick={(event) => {
                  if (!confirm(`Supprimer le lien « ${link.label} » ?`)) {
                    event.preventDefault();
                  }
                }}
              >
                Supprimer
              </button>
              <Button label="Enregistrer" type="submit" />
            </div>
          </form>
        </div>
      </div>
    {:else}
      <p class="text-sm opacity-70">Aucun lien pour l'instant.</p>
    {/each}
  </section>

  <section class="flex flex-col gap-3 rounded-xl bg-base-100 p-4">
    <h2 class="font-bold">Ajouter un lien</h2>

    <form
      method="POST"
      action="?/add"
      class="grid grid-cols-1 gap-3 md:grid-cols-2"
      use:enhance
    >
      {@render fields(null)}

      {#if errorOf('new')}
        <p class="text-sm font-bold text-error md:col-span-2" role="alert">
          {errorOf('new')}
        </p>
      {:else if savedOf('new')}
        <p class="text-sm font-bold text-success md:col-span-2" role="status">
          Lien ajouté.
        </p>
      {/if}

      <div class="flex justify-end md:col-span-2">
        <Button label="Ajouter" type="submit" />
      </div>
    </form>
  </section>
</div>
