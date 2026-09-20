<script lang="ts">
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Languages,
} from '@lucide/svelte';
import { enhance } from '$app/forms';
import { goto } from '$app/navigation';
import Button from '$lib/components/ui/Button.svelte';
import Menu from '$lib/components/ui/Menu.svelte';
import { cn } from '$lib/utils/cn';
import { submitForm } from '$lib/utils/form';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

type SortKey = 'name' | 'version' | 'tversion';

const columns: { label: string; key: SortKey | null }[] = [
  { label: 'Nom', key: 'name' },
  { label: 'Version', key: 'version' },
  { label: 'Trad. Ver.', key: 'tversion' },
  { label: 'Rôle', key: null },
  { label: 'Actions', key: null },
];

const fieldStyle =
  'shadow-mini h-9 rounded-xl border-2 border-transparent bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';

//? Une adresse qui conserve les filtres actuels et n'en change que quelques-uns.
const href = (changes: Record<string, string | number>) => {
  const params = new URLSearchParams();
  const next = { ...data.query, ...changes };

  for (const [key, value] of Object.entries(next)) {
    if (value !== '' && value !== undefined) params.set(key, String(value));
  }

  return `/dashboard/translates?${params}`;
};

const sortHref = (key: SortKey) =>
  href({
    sort: key,
    dir: data.query.sort === key && data.query.dir === 'asc' ? 'desc' : 'asc',
    page: 1,
  });

const error = $derived(form && 'message' in form ? form.message : null);

const roleLabel = (role: string | null | undefined) =>
  role === 'proofreader'
    ? 'Relecteur'
    : role === 'translator'
      ? 'Traducteur'
      : '—';
</script>

<div class="flex flex-col gap-4">
  <h3 class="pt-4 text-center text-xl font-bold">
    Mes traductions ({data.total})
    {#if data.outdatedCount > 0}
      <span class="ml-2 rounded-lg bg-yellow-500/70 px-2 py-0.5 text-sm">
        {data.outdatedCount}
        pas à jour
      </span>
    {/if}
  </h3>

  <form method="GET" class="flex flex-wrap items-end justify-end gap-2">
    <label class="flex flex-col gap-1 text-sm font-bold">
      Jeu
      <input
        class="{fieldStyle} w-64"
        type="search"
        name="q"
        value={data.query.q}
        maxlength="100"
        placeholder="Rechercher un nom..."
      >
    </label>
    <label class="flex flex-col gap-1 text-sm font-bold">
      Statut du jeu
      <select class="{fieldStyle} w-40 cursor-pointer" name="status">
        <option value="" selected={data.query.status === ''}>Tous</option>
        {#each data.statusOptions as option (option.value)}
          <option
            value={option.value}
            selected={option.value === data.query.status}
          >
            {option.label}
          </option>
        {/each}
      </select>
    </label>
    <label class="flex flex-col gap-1 text-sm font-bold">
      Mon rôle
      <select class="{fieldStyle} w-40 cursor-pointer" name="role">
        <option value="" selected={data.query.role === ''}>Tous</option>
        <option value="translator" selected={data.query.role === 'translator'}>
          Traducteur
        </option>
        <option
          value="proofreader"
          selected={data.query.role === 'proofreader'}
        >
          Relecteur
        </option>
      </select>
    </label>
    <input type="hidden" name="sort" value={data.query.sort}>
    <input type="hidden" name="dir" value={data.query.dir}>
    <Button label="Filtrer" type="submit" />
    <a href="/dashboard/translates" class="pb-2 text-sm underline"
      >Réinitialiser</a
    >
  </form>

  {#if error}
    <p class="text-sm font-bold text-error" role="alert">{error}</p>
  {/if}

  {#if data.translations.length === 0}
    <div class="flex flex-col items-center gap-2 py-8">
      <Languages size="64" opacity=".2" />
      <p class="text-sm opacity-60">
        {data.query.q || data.query.status || data.query.role
  ? 'Aucune traduction ne correspond.'
  : "Vous n'avez aucune traduction."}
      </p>
    </div>
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
                  {#if data.query.sort === key}
                    {#if data.query.dir === 'asc'}
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
        {#each data.translations as item (item.translationId)}
          <tr
            class={cn(
  'relative border-collapse odd:bg-base-100 even:bg-base-300',
  item.outdated && 'odd:bg-yellow-500/70! even:bg-yellow-500/60!',
  !item.followed && 'odd:bg-red-600/40! even:bg-red-600/30!',
)}
          >
            <td class="px-4 py-2">
              <span class="flex flex-col">
                <span class="truncate font-bold">{item.name}</span>
                <span class="truncate text-xs opacity-70">
                  {item.typeLabel}
                  · {item.qualityLabel} · jeu {item.editionStatus.toLowerCase()}
                </span>
              </span>
            </td>
            <td class="px-4 py-2 text-center">{item.version}</td>
            <td class="px-4 py-2 text-center">{item.tversion}</td>
            <td class="px-4 py-2 text-center">{roleLabel(item.role)}</td>
            <td class="px-4 py-3">
              <span class="flex items-center justify-center gap-2">
                <Button
                  label="Accéder"
                  size="tiny"
                  onclick={() => goto(`/games/${item.gameId}`)}
                />

                <Menu
                  label="Plus d'actions pour {item.name}"
                  items={[
  {
    label: item.followed ? 'Abandonner' : 'Reprendre',
    icon: item.followed ? BellOff : Bell,
    danger: item.followed,
    onselect: () => submitForm(`follow-${item.translationId}`),
  },
  {
    label: item.anonymous ? 'Afficher mon nom' : 'Rester anonyme',
    icon: item.anonymous ? Eye : EyeOff,
    onselect: () => submitForm(`anonymous-${item.translationId}`),
  },
]}
                />

                <!-- Les entrées du menu soumettent ces formulaires : ils restent cachés dans la ligne. -->
                <form
                  id="follow-{item.translationId}"
                  method="POST"
                  action="?/follow"
                  class="hidden"
                  use:enhance={({ cancel }) => {
  if (
    item.followed &&
    !confirm(
      `Abandonner « ${item.name} » ? Vous ne suivrez plus ses mises à jour et vous n'aurez plus d'alertes.`,
    )
  )
    cancel();
}}
                >
                  <input
                    type="hidden"
                    name="translationId"
                    value={item.translationId}
                  >
                  <input
                    type="hidden"
                    name="value"
                    value={item.followed ? '0' : '1'}
                  >
                </form>

                <form
                  id="anonymous-{item.translationId}"
                  method="POST"
                  action="?/anonymous"
                  class="hidden"
                  use:enhance
                >
                  <input
                    type="hidden"
                    name="translationId"
                    value={item.translationId}
                  >
                  <input
                    type="hidden"
                    name="value"
                    value={item.anonymous ? '0' : '1'}
                  >
                </form>
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <nav
      class="flex items-center justify-center gap-4 pb-4 text-sm"
      aria-label="Pagination"
    >
      {#if data.query.page > 1}
        <a href={href({ page: data.query.page - 1 })} class="underline"
          >← Précédent</a
        >
      {/if}
      <span>Page {data.query.page} / {data.totalPages}</span>
      {#if data.query.page < data.totalPages}
        <a href={href({ page: data.query.page + 1 })} class="underline"
          >Suivant →</a
        >
      {/if}
    </nav>
  {/if}
</div>
