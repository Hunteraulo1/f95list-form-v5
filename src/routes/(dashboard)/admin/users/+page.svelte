<script lang="ts">
import { ArrowDownAZ, ArrowUpAZ, LogIn, UserRound } from '@lucide/svelte';
import { enhance } from '$app/forms';
import Button from '$lib/components/ui/Button.svelte';
import Menu from '$lib/components/ui/Menu.svelte';
import Modal from '$lib/components/ui/Modal.svelte';
import { cn } from '$lib/utils/cn';
import { submitForm } from '$lib/utils/form';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

type Row = PageData['users'][number];
type SortKey = 'name' | 'role' | 'createdAt' | 'translations';

const fieldStyle =
  'shadow-mini h-9 w-full rounded-xl border-2 border-transparent bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary disabled:opacity-60';

const columns = $derived<{ label: string; key: SortKey | null }[]>([
  { label: 'Utilisateur', key: 'name' },
  ...(data.canViewEmails ? [{ label: 'E-mail', key: null }] : []),
  { label: 'Rôle', key: 'role' },
  { label: 'Discord', key: null },
  { label: 'Traductions', key: 'translations' },
  { label: 'Inscrit le', key: 'createdAt' },
  { label: 'Actions', key: null },
]);

let editing = $state<Row | null>(null);
let nameDraft = $state('');
let slugCheck = $state<{
  available: boolean;
  slug: string;
  message?: string;
} | null>(null);

//? Le nom donne le slug de l'adresse du profil : on vérifie sa disponibilité pendant la saisie
//? (le serveur revérifie à l'enregistrement).
$effect(() => {
  const user = editing;
  const name = nameDraft.trim();

  if (!user || !name || name === user.name) {
    slugCheck = null;
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(async () => {
    try {
      const response = await fetch(
        `/admin/users/slug?name=${encodeURIComponent(name)}&id=${user.id}`,
        { signal: controller.signal },
      );
      slugCheck = await response.json();
    } catch {
      //? Requête annulée (saisie suivante) ou réseau : le serveur tranchera à l'enregistrement.
    }
  }, 300);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
});

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

//? Une adresse qui conserve les filtres actuels et n'en change que quelques-uns.
const href = (changes: Record<string, string | number>) => {
  const params = new URLSearchParams();
  const next = { ...data.query, ...changes };

  for (const [key, value] of Object.entries(next)) {
    if (value !== '' && value !== undefined) params.set(key, String(value));
  }

  return `/admin/users?${params}`;
};

const sortHref = (key: SortKey) =>
  href({
    sort: key,
    //? Un même clic inverse le tri ; au premier clic, les plus traducteurs d'abord.
    dir:
      data.query.sort === key
        ? data.query.dir === 'asc'
          ? 'desc'
          : 'asc'
        : key === 'translations'
          ? 'desc'
          : 'asc',
    page: 1,
  });

//? Les refus de « prendre sa place » s'affichent en haut de page (la fenêtre de modification n'est pas ouverte).
const impersonateError = $derived(
  form && 'impersonate' in form && 'message' in form ? form.message : null,
);

const message = $derived(
  form && 'message' in form && 'id' in form && editing?.id === form.id
    ? form.message
    : null,
);
</script>

<div class="flex flex-col gap-4 p-2">
  <h3 class="pt-2 text-center text-xl font-bold">
    Utilisateurs ({data.total})
  </h3>

  {#if impersonateError}
    <p
      class="rounded-xl bg-error/20 p-3 text-sm font-bold text-error"
      role="alert"
    >
      {impersonateError}
    </p>
  {/if}

  <form method="GET" class="flex flex-wrap items-end gap-2">
    <label class="flex flex-col gap-1 text-sm font-bold">
      Recherche
      <input
        class="{fieldStyle} w-72"
        type="search"
        name="q"
        value={data.query.q}
        maxlength="100"
        placeholder={data.canViewEmails ? 'Nom, Discord ou e-mail…' : 'Nom ou Discord…'}
      >
    </label>
    <label class="flex flex-col gap-1 text-sm font-bold">
      Rôle
      <select
        class="{fieldStyle} w-44 cursor-pointer"
        name="role"
        value={data.query.role}
      >
        <option value="">Tous</option>
        {#each data.roles as role (role.id)}
          <option value={role.name} selected={role.name === data.query.role}>
            {role.label}
          </option>
        {/each}
      </select>
    </label>
    <label class="flex flex-col gap-1 text-sm font-bold">
      Type de compte
      <select class="{fieldStyle} w-44 cursor-pointer" name="kind">
        <option value="real" selected={data.query.kind === 'real'}>
          Comptes réels
        </option>
        <option value="ghost" selected={data.query.kind === 'ghost'}>
          Comptes fantômes
        </option>
        <option value="all" selected={data.query.kind === 'all'}>Tous</option>
      </select>
    </label>
    <input type="hidden" name="sort" value={data.query.sort}>
    <input type="hidden" name="dir" value={data.query.dir}>
    <Button label="Filtrer" type="submit" />
    <a href="/admin/users" class="pb-2 text-sm underline">Réinitialiser</a>
  </form>

  {#if data.users.length === 0}
    <div class="flex flex-col items-center gap-2 py-8">
      <UserRound size="64" opacity=".2" />
      <p class="text-sm opacity-60">Aucun utilisateur ne correspond.</p>
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
        {#each data.users as user (user.id)}
          <tr class="relative border-collapse odd:bg-base-100 even:bg-base-300">
            <td class="px-4 py-2">
              <span class="flex min-w-0 items-center gap-2">
                {#if user.avatar}
                  <img
                    src={user.avatar}
                    alt=""
                    loading="lazy"
                    class="size-8 shrink-0 rounded-full bg-base-300 object-cover"
                  >
                {:else}
                  <span
                    class="flex size-8 shrink-0 items-center justify-center rounded-full bg-base-300"
                  >
                    <UserRound size="16" opacity=".5" />
                  </span>
                {/if}
                <span class="truncate font-bold">{user.name}</span>
                {#if user.ghost}
                  <span
                    class="shrink-0 rounded-lg bg-warning/20 px-2 py-0.5 text-xs font-bold"
                    title="Traducteur sans compte : ni e-mail ni connexion, revendicable"
                  >
                    Fantôme
                  </span>
                {/if}
              </span>
            </td>
            {#if data.canViewEmails}
              <td class="truncate px-4 py-2 text-center text-sm">
                {user.email ?? '—'}
              </td>
            {/if}
            <td class="px-4 py-2 text-center">{user.role.label}</td>
            <td class="px-4 py-2 text-center font-mono text-sm">
              {user.discord ?? '—'}
            </td>
            <td class="px-4 py-2 text-center">{user.translations}</td>
            <td class="px-4 py-2 text-center">
              {dateFormat.format(new Date(user.createdAt))}
            </td>
            <td class="px-4 py-2">
              <span class="flex flex-wrap justify-center gap-2">
                <Button
                  label="Modifier"
                  size="tiny"
                  classes={cn(!user.canEdit && 'pointer-events-none opacity-50')}
                  onclick={() => {
  editing = user;
  nameDraft = user.name;
}}
                />
                {#if data.canImpersonate}
                  <Menu
                    label="Plus d'actions pour {user.name}"
                    items={[
  {
    label: 'Prendre sa place',
    icon: LogIn,
    disabled: !user.canImpersonate,
    title: user.impersonateBlockedReason ?? undefined,
    onselect: () => submitForm(`impersonate-${user.id}`),
  },
]}
                  />

                  <!-- L'entrée du menu soumet ce formulaire : il reste caché dans la ligne. -->
                  <form
                    id="impersonate-{user.id}"
                    method="POST"
                    action="?/impersonate"
                    class="hidden"
                    use:enhance
                  >
                    <input type="hidden" name="id" value={user.id}>
                  </form>
                {/if}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <nav
      class="flex items-center justify-center gap-4 text-sm"
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

<Modal
  open={editing !== null}
  onclose={() => (editing = null)}
  title="Modifier l'utilisateur"
  description={editing?.ghost ? "Compte fantôme : il n'a ni e-mail ni connexion." : undefined}
>
  {#if editing}
    {#key editing.id}
      <form
        method="POST"
        action="?/updateUser"
        class="flex flex-col gap-4"
        use:enhance={() =>
  async ({ result, update }) => {
    await update({ reset: false });
    if (result.type === 'success') editing = null;
  }}
      >
        <input type="hidden" name="id" value={editing.id}>

        <label class="flex flex-col gap-1 text-sm font-bold">
          Nom
          <input
            class={fieldStyle}
            name="name"
            maxlength="64"
            required
            bind:value={nameDraft}
          >
          <span
            class={cn(
  'text-xs font-normal',
  slugCheck && (slugCheck.available ? 'text-success' : 'font-bold text-error'),
)}
          >
            {#if slugCheck?.available === false}
              {slugCheck.message}
            {:else if slugCheck}
              Lien du profil : /profile/{slugCheck.slug}
              (disponible)
            {:else}
              Lien du profil : /profile/{editing.slug}
            {/if}
          </span>
        </label>
        <label class="flex flex-col gap-1 text-sm font-bold">
          Avatar (adresse http/https)
          <input
            class={fieldStyle}
            type="url"
            name="avatar"
            maxlength="2048"
            placeholder="https://…"
            value={editing.avatar ?? ''}
          >
        </label>
        <label class="flex flex-col gap-1 text-sm font-bold">
          Identifiant Discord
          <input
            class="{fieldStyle} font-mono"
            name="discord"
            inputmode="numeric"
            maxlength="32"
            value={editing.discord ?? ''}
          >
        </label>
        <label class="flex flex-col gap-1 text-sm font-bold">
          Rôle
          <select class="{fieldStyle} cursor-pointer" name="roleId">
            {#each data.roles as role (role.id)}
              <option
                value={role.id}
                selected={role.id === editing.role.id}
                disabled={!role.assignable && role.id !== editing.role.id}
                title={role.blockedReason ?? undefined}
              >
                {role.label}
              </option>
            {/each}
          </select>
          {#if editing.isSelf}
            <span class="text-xs font-normal opacity-70">
              Vous ne pouvez pas modifier votre propre rôle.
            </span>
          {/if}
        </label>

        {#if message}
          <p class="text-sm font-bold text-error" role="alert">{message}</p>
        {/if}

        <div class="flex justify-end gap-2">
          <Button label="Annuler" inline onclick={() => (editing = null)} />
          <Button
            label="Enregistrer"
            type="submit"
            classes={cn(slugCheck?.available === false && 'pointer-events-none opacity-50')}
          />
        </div>
      </form>
    {/key}
  {/if}
</Modal>
