<script lang="ts">
import type { Page } from '@sveltejs/kit';
import { page } from '$app/state';
import Button from '$lib/components/ui/Button.svelte';

export type ErrorMessages = Partial<
  Record<Page['status'], App.Error['message']>
>;

const DEFAULT_MESSAGES: ErrorMessages = {
  400: "Cette requête n'est pas valide",
  401: 'Vous devez être connecté pour accéder à cette page',
  403: "Vous n'avez pas accès à cette page",
  404: "Cette page n'existe pas",
  405: "Cette méthode n'est pas autorisée",
  408: 'Le délai de la requête a expiré',
  429: 'Trop de requêtes, veuillez réessayer plus tard',
  500: 'Une erreur interne est survenue',
  502: 'Le serveur a reçu une réponse invalide',
  503: 'Le service est temporairement indisponible',
  504: 'Le serveur a mis trop de temps à répondre',
};

interface Props {
  status?: Page['status'];
  message?: App.Error['message'];
}

const { status = page.status, message: messageProp }: Props = $props();

const message = $derived(
  messageProp ?? DEFAULT_MESSAGES[status] ?? page.error?.message,
);
</script>

<div
  class="flex flex-col gap-2 justify-center items-center px-4 py-24 text-center"
>
  <h1 class="text-4xl font-bold">{status}</h1>
  <p class="text-base-content/70">{message}</p>

  <Button
    label="retour en arrière"
    classes="mt-4"
    size="big"
    onclick={() => history.back()}
  />
</div>
