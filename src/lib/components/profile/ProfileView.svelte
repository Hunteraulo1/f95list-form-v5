<script lang="ts">
import { ArrowDownAZ, ArrowUpAZ, ImageOff, PenOff } from '@lucide/svelte';
import type { Snippet } from 'svelte';
import { goto } from '$app/navigation';
import Button from '$lib/components/ui/Button.svelte';
import MarkdownContent from '$lib/components/ui/MarkdownContent.svelte';
import type { MarkdownBlock } from '$lib/markdown/content';
import type {
  loadProfileTranslations,
  ProfileSort,
  ProfileTranslationsQuery,
} from '$lib/server/profile';

export type ProfileField = 'avatar' | 'banner' | 'description';

interface Props {
  profile: {
    name: string;
    roleLabel: string;
    avatar: string | null;
    banner: string | null;
    description: string | null;
  };
  //? La description en arbre sûr (voir `parseMarkdownDocument`) : jamais de HTML brut.
  descriptionDocument: MarkdownBlock[];
  translations: Awaited<ReturnType<typeof loadProfileTranslations>>;
  query: ProfileTranslationsQuery;
  //? Adresse de cette page, pour les liens de tri, de recherche et de pagination.
  basePath: string;
  //? Adresse publique de ce profil, montrée quand on consulte le sien.
  publicPath?: string;
  editMode?: boolean;
  onedit?: (field: ProfileField) => void;
  //? Quand `editingDescription` est vrai, l'éditeur prend la place du texte, dans le même bloc.
  editingDescription?: boolean;
  descriptionEditor?: Snippet;
}

const {
  profile,
  descriptionDocument,
  translations,
  query,
  basePath,
  publicPath,
  editMode = false,
  onedit,
  editingDescription = false,
  descriptionEditor,
}: Props = $props();

const columns: { label: string; key: ProfileSort | null }[] = [
  { label: 'Nom', key: 'name' },
  { label: 'Version', key: 'version' },
  { label: 'Trad. Ver.', key: 'tversion' },
  { label: 'Rôle', key: null },
  { label: 'Actions', key: null },
];

const href = (changes: Record<string, string | number>) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...query, ...changes })) {
    if (value !== '' && value !== undefined) params.set(key, String(value));
  }

  return `${basePath}?${params}`;
};

const sortHref = (key: ProfileSort) =>
  href({
    sort: key,
    dir: query.sort === key && query.dir === 'asc' ? 'desc' : 'asc',
    page: 1,
  });

const roleLabel = (role: string | null) =>
  role === 'proofreader' ? 'Relecteur' : 'Traducteur';

const editButton =
  'absolute cursor-pointer bg-neutral/50 px-5 py-1 text-neutral-content';
</script>

<div class="flex flex-wrap gap-2 md:flex-nowrap">
  <section class="flex w-80 max-w-full flex-col items-center p-4">
    <div
      class="relative flex size-48 items-center justify-center overflow-hidden rounded-full bg-base-300 p-2"
    >
      {#if profile.avatar}
        <img
          src={profile.avatar}
          alt="Profil de {profile.name}"
          referrerpolicy="no-referrer"
          class="size-full rounded-full object-cover"
        >
      {:else}
        <ImageOff size="64" opacity=".2" />
      {/if}

      {#if editMode}
        <button
          type="button"
          class="absolute h-full w-full cursor-pointer rounded-full bg-neutral/50 text-neutral-content opacity-0 hover:opacity-100 focus-visible:opacity-100"
          onclick={() => onedit?.('avatar')}
        >
          Changer l'image
        </button>
      {/if}
    </div>

    <h2 class="mt-4 text-center font-bold wrap-break-word">{profile.name}</h2>
    <h3>{profile.roleLabel}</h3>
    {#if publicPath}
      <a
        href={publicPath}
        class="mt-1 text-xs underline opacity-70 hover:opacity-100"
      >
        Lien public : {publicPath}
      </a>
    {/if}
  </section>

  <section class="flex min-h-80 w-full min-w-0 flex-col gap-4">
    {#if profile.banner || editMode}
      <div
        class="relative flex h-48 items-center justify-center overflow-hidden rounded-xl bg-base-300"
      >
        {#if profile.banner}
          <img
            src={profile.banner}
            alt="Bannière de profil de {profile.name}"
            referrerpolicy="no-referrer"
            class="size-full object-cover"
          >
        {:else}
          <ImageOff size="64" opacity=".2" />
        {/if}

        {#if editMode}
          <button
            type="button"
            class="{editButton} right-0 bottom-0 rounded-tl-lg"
            onclick={() => onedit?.('banner')}
          >
            Changer la bannière
          </button>
        {/if}
      </div>
    {/if}

    {#if profile.description || editMode || editingDescription}
      <div
        class="relative flex min-h-48 flex-col justify-center overflow-hidden rounded-xl bg-base-300 p-6"
      >
        {#if editingDescription && descriptionEditor}
          {@render descriptionEditor()}
        {:else}
          {#if profile.description}
            <MarkdownContent
              document={descriptionDocument}
              class="w-full self-start"
            />
          {:else}
            <PenOff class="mx-auto" size="64" opacity=".2" />
          {/if}

          {#if editMode}
            <button
              type="button"
              class="{editButton} right-0 bottom-0 rounded-tl-lg"
              onclick={() => onedit?.('description')}
            >
              Changer la description
            </button>
          {/if}
        {/if}
      </div>
    {/if}

    {#if translations.total}
      <div class="relative flex flex-col rounded-xl p-2">
        <h3 class="py-4 text-center text-xl font-bold">
          Traductions ({translations.total})
        </h3>

        {#if translations.hiddenAnonymous > 0}
          <p class="pb-2 text-center text-sm opacity-70">
            {translations.hiddenAnonymous}
            traduction{translations.hiddenAnonymous > 1 ? 's' : ''}
            anonyme{translations.hiddenAnonymous > 1 ? 's ne sont' : " n'est"}
            pas listée{translations.hiddenAnonymous > 1 ? 's' : ''}
            publiquement.
          </p>
        {/if}

        <form
          method="GET"
          action={basePath}
          class="my-4 flex justify-end gap-2"
        >
          <input
            class="shadow-mini h-9 w-64 rounded-xl border-2 border-transparent bg-neutral-content px-4 text-sm font-bold text-primary transition-all outline-none hover:border-primary focus:border-primary"
            type="search"
            name="q"
            value={query.q}
            maxlength="100"
            placeholder="Rechercher un nom..."
          >
          <input type="hidden" name="sort" value={query.sort}>
          <input type="hidden" name="dir" value={query.dir}>
          <Button label="Filtrer" type="submit" />
        </form>

        {#if translations.items.length === 0}
          <p class="py-8 text-center text-sm opacity-60">
            {query.q ? 'Aucune traduction ne correspond.' : 'Aucune traduction.'}
          </p>
        {:else}
          <table class="w-full table-fixed border-spacing-2">
            <thead>
              <tr>
                {#each columns as { label, key }}
                  <th scope="col" class="select-none">
                    {#if key}
                      <a
                        href={sortHref(key)}
                        class="flex items-center justify-center gap-2"
                      >
                        {label}
                        {#if query.sort === key}
                          {#if query.dir === 'asc'}
                            <ArrowDownAZ size="16" />
                          {:else}
                            <ArrowUpAZ size="16" />
                          {/if}
                        {/if}
                      </a>
                    {:else}
                      {label}
                    {/if}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each translations.items as item (item.translationId)}
                <tr
                  class="relative border-collapse odd:bg-base-100 even:bg-base-300"
                >
                  <td class="px-4 py-2">
                    <span class="flex flex-col">
                      <span class="truncate font-bold">{item.name}</span>
                      <span class="truncate text-xs opacity-70">
                        jeu {item.gameStatus.toLowerCase()}
                      </span>
                    </span>
                  </td>
                  <td class="px-4 py-2 text-center">{item.version}</td>
                  <td
                    class="px-4 py-2 text-center {item.outdated ? 'text-yellow-500' : ''}"
                  >
                    {item.tversion}
                  </td>
                  <td class="px-4 py-2 text-center">{roleLabel(item.role)}</td>
                  <td class="flex justify-center gap-2 px-4 py-3">
                    <Button
                      label="Accéder"
                      size="tiny"
                      onclick={() => goto(`/games/${item.gameId}`)}
                    />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>

          <nav
            class="flex items-center justify-center gap-4 pt-4 text-sm"
            aria-label="Pagination"
          >
            {#if translations.page > 1}
              <a href={href({ page: translations.page - 1 })} class="underline"
                >← Précédent</a
              >
            {/if}
            <span>Page {translations.page} / {translations.totalPages}</span>
            {#if translations.page < translations.totalPages}
              <a href={href({ page: translations.page + 1 })} class="underline"
                >Suivant →</a
              >
            {/if}
          </nav>
        {/if}
      </div>
    {/if}
  </section>
</div>
