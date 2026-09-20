<script lang="ts">
import { KeyRound } from '@lucide/svelte';
import { enhance } from '$app/forms';
import Button from '$lib/components/ui/Button.svelte';
import Input from '$lib/components/ui/Input.svelte';
import Modal from '$lib/components/ui/Modal.svelte';
import { cn } from '$lib/utils/cn';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

let name = $state('');
let created = $state<{ name: string; key: string } | null>(null);
let copied = $state(false);

const atLimit = $derived(data.keys.length >= data.limit);
const error = $derived(form && 'error' in form ? form.error : null);

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const formatDate = (iso: string) => dateFormat.format(new Date(iso));

const copy = async () => {
  if (!created) return;

  try {
    await navigator.clipboard.writeText(created.key);
    copied = true;
  } catch {
    copied = false;
  }
};

const closeModal = () => {
  created = null;
  copied = false;
};
</script>

<div class="flex flex-col gap-4">
  <section class="flex flex-col gap-2 rounded-xl bg-base-100 p-4">
    <h2 class="font-bold">Créer une clé API</h2>
    <p class="text-sm opacity-70">
      Une clé permet d'accéder à l'API en votre nom. Elle n'est affichée qu'une
      seule fois à sa création : conservez-la en lieu sûr. Chaque clé peut faire
      {data.dailyQuota}
      requêtes par jour (remise à zéro à minuit UTC), sauf quota personnalisé.
    </p>

    <form
      method="POST"
      action="?/create"
      class="flex gap-2"
      use:enhance={() =>
  async ({ result, update }) => {
    await update();

    if (result.type === 'success' && result.data?.created) {
      created = result.data.created as { name: string; key: string };
      name = '';
    }
  }}
    >
      <input type="hidden" name="name" value={name}>
      <Input
        classes="w-full"
        size="big"
        placeholder="Nom de la clé (ex : Extension navigateur)"
        value={name}
        oninput={(e) => (name = e.currentTarget.value)}
      />
      <Button
        label="Créer"
        type="submit"
        classes={cn(atLimit && 'pointer-events-none opacity-50')}
      />
    </form>

    {#if error}
      <p class="text-sm font-bold text-error">{error}</p>
    {:else if atLimit}
      <p class="text-sm opacity-70">
        Limite de {data.limit} clés atteinte : révoquez-en une pour en créer une
        nouvelle.
      </p>
    {/if}
  </section>

  <section class="flex flex-col gap-2 rounded-xl bg-base-100 p-4">
    <h2 class="font-bold">Mes clés ({data.keys.length}/{data.limit})</h2>

    {#if data.keys.length === 0}
      <div class="flex flex-col items-center gap-2 py-8">
        <KeyRound size="64" opacity=".2" />
        <p class="text-sm opacity-60">Vous n'avez aucune clé API.</p>
      </div>
    {:else}
      <table class="w-full table-fixed border-spacing-2">
        <thead>
          <tr>
            <th scope="col">Nom</th>
            <th scope="col">Clé</th>
            <th scope="col">Créée le</th>
            <th scope="col">Dernière utilisation</th>
            <th scope="col">Requêtes du jour</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each data.keys as key (key.id)}
            <tr class="odd:bg-base-100 even:bg-base-300">
              <td class="truncate px-4 py-2 font-bold">{key.name}</td>
              <td class="px-4 py-2 text-center font-mono text-sm">
                {key.prefix}…
              </td>
              <td class="px-4 py-2 text-center">{formatDate(key.createdAt)}</td>
              <td class="px-4 py-2 text-center">
                {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Jamais'}
              </td>
              <td
                class={cn('px-4 py-2 text-center', key.used >= key.quota && 'font-bold text-error')}
              >
                {key.used}
                / {key.quota}
              </td>
              <td class="px-4 py-2">
                <form
                  method="POST"
                  action="?/revoke"
                  class="flex justify-center"
                  use:enhance={({ cancel }) => {
  if (
    !confirm(
      `Révoquer la clé « ${key.name} » ? Les applications qui l'utilisent perdront l'accès.`,
    )
  ) {
    cancel();
  }
}}
                >
                  <input type="hidden" name="id" value={key.id}>
                  <Button
                    label="Révoquer"
                    type="submit"
                    size="tiny"
                    classes="hover:bg-red-400 hover:text-white"
                  />
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>
</div>

<Modal
  open={created !== null}
  onclose={closeModal}
  title="Clé API créée"
  description="Copiez cette clé maintenant : elle ne sera plus affichée."
>
  {#if created}
    <div class="flex flex-col gap-2">
      <span class="text-sm font-bold">{created.name}</span>
      <code
        class="rounded-xl bg-base-300 p-3 font-mono text-sm break-all select-all"
      >
        {created.key}
      </code>
    </div>
  {/if}

  {#snippet footer()}
    <Button label={copied ? 'Copiée !' : 'Copier'} inline onclick={copy} />
    <Button label="J'ai copié la clé" onclick={closeModal} />
  {/snippet}
</Modal>
