<script lang="ts">
import type { Snippet } from 'svelte';
import { isExemptFromAgeGate } from '#lib/age-gate.ts';
import favicon from '#lib/assets/favicon.svg';
import Button from '#lib/components/ui/Button.svelte';
import ImpersonationBanner from '#lib/components/ui/ImpersonationBanner.svelte';
import Modal from '#lib/components/ui/Modal.svelte';
import QueryProvider from '#lib/query/QueryProvider.svelte';
import { page } from '$app/state';
import '../app.css';
import type { LayoutData } from './$types';

interface Props {
  children: Snippet;
  data: LayoutData;
}

let { children, data }: Props = $props();

//? Contenu réservé aux adultes : tant que le visiteur n'a pas confirmé son âge, la page reste floutée
//? et inerte derrière la fenêtre de confirmation. Sa réponse part à `/age` (un simple point d'envoi), qui la
//? retient un an sur l'appareil et ramène ici.
const gated = $derived(
  !data.adultConfirmed && !isExemptFromAgeGate(page.url.pathname),
);
const confirmUrl = $derived(
  `/age?redirectTo=${encodeURIComponent(page.url.pathname + page.url.search)}`,
);
</script>

<svelte:head>
  <link rel="icon" href={favicon}>
</svelte:head>

<QueryProvider>
  <main class="h-full min-h-screen bg-base-200 pb-16 font-[Fustat]">
    {#if gated}
      <!-- Sans JavaScript, la fenêtre ne s'ouvre pas : le même bouton, en haut de la page. -->
      <noscript>
        <form
          method="POST"
          action={confirmUrl}
          class="fixed inset-x-0 top-0 z-50 bg-base-100 p-4 text-center"
        >
          <button type="submit" class="cursor-pointer underline">
            Ce site est réservé aux adultes : j'ai 18 ans ou plus, entrer
          </button>
        </form>
      </noscript>
    {/if}

    <!-- Avant la confirmation, la page n'est qu'un décor : floutée, sans clic, ni clavier, ni lecture d'écran. -->
    <div
      class={gated ? 'pointer-events-none blur-sm select-none' : 'contents'}
      inert={gated}
      aria-hidden={gated}
    >
      {@render children()}
    </div>
  </main>

  <Modal
    open={gated}
    closable={false}
    size="small"
    title="Contenu réservé aux adultes"
    description="Ce site présente des jeux pour adultes, avec des images et des textes à caractère sexuel. Son accès est interdit aux mineurs."
  >
    <div class="flex flex-col items-center gap-4 p-1 text-center">
      <p class="text-sm opacity-70">
        En entrant, tu certifies avoir 18 ans ou plus, et être majeur selon la
        loi de ton pays.
      </p>

      <!-- Envoi classique : la réponse ramène sur cette page, cette fois affichée. -->
      <form method="POST" action={confirmUrl} class="w-full">
        <Button label="J'ai 18 ans ou plus : entrer" type="submit" full />
      </form>
      <a
        href="https://www.google.com"
        rel="noreferrer"
        class="text-sm underline"
      >
        Je suis mineur : quitter le site
      </a>
    </div>
  </Modal>

  {#if data.impersonator && data.user}
    <ImpersonationBanner
      as={data.user.name}
      role={data.user.role.label}
      from={data.impersonator.name}
    />
  {/if}
</QueryProvider>
