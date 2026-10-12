<script lang="ts">
import Button from '#lib/components/ui/Button.svelte';
import ColorBadge from '#lib/components/ui/games/ColorBadge.svelte';
import EditEditionModal, {
  type EditEditionValues,
} from '#lib/components/ui/games/EditEditionModal.svelte';
import EditGameModal from '#lib/components/ui/games/EditGameModal.svelte';
import EditTranslationModal, {
  type EditTranslationValues,
} from '#lib/components/ui/games/EditTranslationModal.svelte';
import ReportGameModal from '#lib/components/ui/games/ReportGameModal.svelte';
import { cn } from '#lib/utils/cn.ts';
import { enhance } from '$app/forms';
import { goto } from '$app/navigation';
import type { PageData } from './$types.js';

interface Props {
  data: PageData;
}

const { data }: Props = $props();

let reportOpen = $state(false);
let editOpen = $state(false);

interface RefreshSummary {
  editions: number;
  tagsAdded: number;
  tagsRemoved: number;
}
let refreshing = $state(false);
let refreshMessage = $state<{ error: boolean; text: string } | null>(null);
//? L'édition en cours de modification (même principe que la traduction ci-dessous).
let editedEdition = $state<{
  id: string;
  label: string;
  values: EditEditionValues;
} | null>(null);
//? La traduction en cours de modification (sa fenêtre n'est montée que le temps d'être ouverte).
let editedTranslation = $state<{
  id: string;
  label: string;
  editionVersion: string;
  values: EditTranslationValues;
} | null>(null);

const reportTranslations = $derived(
  data.game.gameEditions.flatMap((edition) =>
    edition.gameTranslations.map((translation) => ({
      id: translation.id,
      label: `${edition.name} — ${translation.version}`,
    })),
  ),
);

const getHostname = (link: string) => {
  try {
    return `${new URL(link).hostname}`;
  } catch {
    return 'un site externe';
  }
};
</script>

<div class="flex flex-col gap-4">
  <section class="relative flex min-h-60 flex-col gap-4 md:grid md:grid-cols-5">
    <div
      class="col-span-3 h-full w-full overflow-hidden rounded-xl bg-base-100 bg-cover bg-center bg-no-repeat text-2xl font-bold hover:bg-contain"
      style="background-image: url({data.game.image});"
    >
      <div
        class="flex h-full w-full flex-col items-center justify-center bg-base-300/80 p-4 transition-all select-none hover:opacity-0"
      >
        {data.game.name}
        <span class="text-sm">{data.game.description}</span>
      </div>
    </div>
    <div
      class="col-span-2 flex max-h-full min-h-60 flex-col gap-2 rounded-xl bg-base-100 p-4"
    >
      <div class="overflow-y-scroll">
        <div class="font-bold">Tags:</div>
        {#each data.game.tags as tag, index}
          {#if index !== 0}
            ,
          {/if}
          {tag.name}
        {/each}
      </div>

      <div>
        <span class="font-bold">ID du thread:</span>
        {data.game.threadId}
      </div>

      <Button
        label="Accèder à {getHostname(data.game.link)}"
        classes="mt-auto"
        full
        onclick={() => open(data.game.link, 'blank_')}
      />
    </div>
  </section>

  {#if !data.game.active}
    <p class="rounded-xl bg-warning/20 p-4 text-sm font-bold" role="status">
      Ce jeu est désactivé : il n'apparaît plus sur le site, seule
      l'administration le voit encore.
    </p>
  {/if}

  <section
    class="flex w-full flex-wrap gap-4 rounded-xl bg-base-100 p-4 items-center"
  >
    {#if data.access.editGame}
      {#if data.access.refreshGame}
        <form
          method="POST"
          action="?/refresh"
          use:enhance={() => {
            refreshing = true;
            refreshMessage = null;

            return async ({ result, update }) => {
              await update({ reset: false });
              refreshing = false;

              if (result.type === 'success' && result.data?.refreshed) {
                const { editions, tagsAdded, tagsRemoved } = result.data
                  .refreshed as RefreshSummary;
                refreshMessage = {
                  error: false,
                  text: `Données actualisées depuis F95zone : ${editions} édition(s) mise(s) à jour, ${tagsAdded} tag(s) ajouté(s), ${tagsRemoved} retiré(s).`,
                };
              } else if (result.type === 'failure') {
                refreshMessage = {
                  error: true,
                  text: String(
                    result.data?.refreshError ?? "L'actualisation a échoué.",
                  ),
                };
              }
            };
          }}
        >
          <Button
            label={refreshing ? 'Actualisation…' : 'Actualiser les données'}
            type="submit"
            disabled={refreshing}
          />
        </form>
      {/if}
      <Button label="Modifier le jeu" onclick={() => (editOpen = true)} />
    {/if}
    {#if data.access.setActive}
      {@render activeToggle(
        'game',
        String(data.game.id),
        data.game.active,
        data.game.active ? 'Désactiver le jeu' : 'Réactiver le jeu',
        `Désactiver « ${data.game.name} » ? Le jeu et toutes ses traductions disparaîtront du site jusqu'à sa réactivation.`,
      )}
    {/if}
    <Button
      label="Signaler un problème"
      inline
      classes="border-error text-error! hover:bg-error-content ml-auto"
      onclick={() => (reportOpen = true)}
    />
  </section>

  {#if refreshMessage}
    <p
      class="rounded-xl bg-base-100 p-4 text-sm font-bold"
      class:text-error={refreshMessage.error}
      role={refreshMessage.error ? 'alert' : 'status'}
    >
      {refreshMessage.text}
    </p>
  {/if}

  <section class="flex w-full flex-col gap-4 rounded-xl bg-base-100 p-4">
    <div class="flex items-center justify-between gap-2">
      <span class="font-bold">Traductions</span>
      {#if data.access.addTranslation}
        <Button
          label="Ajouter une traduction"
          size="small"
          onclick={() =>
            goto(`/dashboard/games/${data.game.id}/translations/new`)}
        />
      {/if}
    </div>

    {#each data.game.gameEditions as edition}
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class={cn('font-bold', !edition.active && 'opacity-60')}>
            {edition.name}
          </span>
          {#if !edition.active}
            {@render inactiveBadge('Désactivée')}
          {/if}
          {#if edition.edit}
            {@const values = edition.edit}
            <Button
              label="Modifier l'édition"
              inline
              size="small"
              classes="ml-auto"
              onclick={() =>
                (editedEdition = {
                  id: edition.id,
                  label: edition.name,
                  values,
                })}
            />
          {/if}
          {#if data.access.setActive}
            {@render activeToggle(
              'edition',
              edition.id,
              edition.active,
              edition.active ? "Désactiver l'édition" : "Réactiver l'édition",
              `Désactiver l'édition « ${edition.name} » ? Ses traductions disparaîtront du site jusqu'à sa réactivation.`,
              edition.edit ? '' : 'ml-auto',
            )}
          {/if}
        </div>

        <div
          class="flex flex-col divide-y divide-base-content/10 overflow-hidden rounded-xl bg-base-200"
        >
          {#each edition.gameTranslations as translation}
            <div
              class="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div
                class={cn(
                  'flex flex-col gap-1',
                  !translation.active && 'opacity-60',
                )}
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-bold">{translation.version}</span>
                  <ColorBadge
                    item={translation.quality}
                    label={translation.qualityLabel}
                  />
                  {#if translation.type !== 'translation'}
                    <ColorBadge
                      item={translation.type}
                      label={translation.typeLabel}
                    />
                  {/if}
                  {#if !translation.active}
                    {@render inactiveBadge('Désactivée')}
                  {/if}
                </div>

                <span class="text-sm text-base-content/70">
                  {#if translation.translators.length > 0}
                    Par
                    {#each translation.translators as translator, index (translator.name)}
                      {#if index > 0}
                        ,
                      {/if}
                      {#if translator.slug}
                        <a
                          href="/profile/{translator.slug}"
                          class="underline hover:text-primary"
                        >
                          {translator.name}
                        </a>
                      {:else}
                        {translator.name}
                      {/if}
                    {/each}
                  {:else}
                    Aucun traducteur
                  {/if}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2 md:justify-end">
                {#if translation.file?.internalLink}
                  {@render downloadLink(
                    translation.file.internalLink,
                    'F95France',
                    false,
                  )}
                {/if}
                {#if translation.file?.externalLink}
                  {@render downloadLink(
                    translation.file.externalLink,
                    getHostname(translation.file.externalLink),
                    Boolean(translation.file.internalLink),
                  )}
                {/if}
                {#if !translation.file?.internalLink &&
                  !translation.file?.externalLink}
                  <span class="px-4 text-sm font-bold text-base-content/70"
                    >Aucun fichier</span
                  >
                {/if}
                {#if translation.edit}
                  {@const values = translation.edit}
                  <Button
                    label="Modifier"
                    inline
                    onclick={() =>
                      (editedTranslation = {
                        id: translation.id,
                        label: `${edition.name} — ${translation.version || translation.typeLabel}`,
                        editionVersion: edition.version,
                        values,
                      })}
                  />
                {/if}
                {#if data.access.setActive}
                  {@render activeToggle(
                    'translation',
                    translation.id,
                    translation.active,
                    translation.active ? 'Désactiver' : 'Réactiver',
                    null,
                  )}
                {/if}
              </div>
            </div>
          {:else}
            <p class="p-4 text-sm text-base-content/70">Aucune traduction.</p>
          {/each}
        </div>
      </div>
    {/each}
  </section>
</div>

<ReportGameModal
  bind:open={reportOpen}
  gameName={data.game.name}
  translations={reportTranslations}
/>

<!-- Montée seulement ouverte : elle repart ainsi des valeurs actuelles du jeu à chaque fois. -->
{#if editOpen && data.edit}
  <EditGameModal
    values={data.edit.values}
    origins={data.edit.origins}
    tags={data.edit.tags}
    hasInternalImage={data.edit.hasInternalImage}
    canManageAutoCheck={data.edit.canManageAutoCheck}
    onclose={() => (editOpen = false)}
  />
{/if}

{#if editedEdition && data.editionForm}
  <EditEditionModal
    editionId={editedEdition.id}
    label={editedEdition.label}
    values={editedEdition.values}
    statuses={data.editionForm.statuses}
    canManageAutoCheck={data.editionForm.canManageAutoCheck}
    onclose={() => (editedEdition = null)}
  />
{/if}

{#if editedTranslation && data.translationForm}
  <EditTranslationModal
    translationId={editedTranslation.id}
    label={editedTranslation.label}
    editionVersion={editedTranslation.editionVersion}
    values={editedTranslation.values}
    types={data.translationForm.types}
    qualities={data.translationForm.qualities}
    staff={data.translationForm.staff}
    self={data.translationForm.self}
    onclose={() => (editedTranslation = null)}
  />
{/if}

{#snippet inactiveBadge(
  label: string,
)}
  <span class="rounded-lg bg-warning px-2 py-0.5 text-xs font-bold text-black">
    {label}
  </span>
{/snippet}

<!-- Désactiver masque du site sans rien supprimer ; `warning` : la question posée avant de masquer. -->
{#snippet activeToggle(
  kind: 'game' | 'edition' | 'translation',
  id: string,
  active: boolean,
  label: string,
  warning: string | null,
  classes = '',
)}
  <form
    method="POST"
    action="?/setActive"
    class={classes}
    use:enhance={({ cancel }) => {
      if (active && warning && !confirm(warning)) cancel();

      return async ({ update }) => {
        await update({ reset: false });
      };
    }}
  >
    <input type="hidden" name="kind" value={kind}>
    <input type="hidden" name="id" value={id}>
    <input type="hidden" name="active" value={String(!active)}>
    <Button {label} type="submit" inline size="small" />
  </form>
{/snippet}

{#snippet downloadLink(
  link: string,
  label: string,
  secondary: boolean,
)}
  <Button
    {label}
    inline={secondary}
    onclick={() => open(link, '_blank', 'noopener')}
  />
{/snippet}
