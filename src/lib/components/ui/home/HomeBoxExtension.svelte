<script lang="ts">
import { onMount } from 'svelte';
import HomeBox from '#lib/components/ui/home/HomeBox.svelte';
import MockupExtension from '#lib/components/ui/home/mockups/MockupExtension.svelte';
import {
  detectExtensionBrowserTarget,
  type ExtensionBrowserTarget,
  type ExtensionDownloadUrls,
  extensionDownloadHref,
  extensionDownloadLabel,
} from '#lib/extension-browser.ts';

interface Props {
  //? Jeux montrés dans la maquette (voir `listExtensionMockupGames`).
  games: {
    id: string;
    name: string;
    image: string;
    tversion: string;
    upToDate: boolean;
  }[];
  downloads: ExtensionDownloadUrls;
  //? Navigateur deviné par le serveur d'après l'en-tête de la requête.
  browser: ExtensionBrowserTarget;
}

const { games, downloads, browser }: Props = $props();

//? Redétecté dans le navigateur une fois la page affichée : l'en-tête vu par le serveur peut
//? manquer ou venir d'un intermédiaire.
let detected = $state<ExtensionBrowserTarget | null>(null);
onMount(() => {
  detected = detectExtensionBrowserTarget(navigator.userAgent);
});

const target = $derived(detected ?? browser);

//? La marche à suivre pour Chrome est repliée : elle s'ouvre quand on clique dessus, ou quand on
//? lance le téléchargement.
let installOpen = $state(false);
const buttons = $derived([
  {
    href: extensionDownloadHref(target, downloads),
    label: extensionDownloadLabel(target),
    external: true,
    onclick: () => {
      installOpen = true;
    },
  },
  //? Navigateur inconnu : le premier bouton mène déjà à cette page.
  ...(target === 'unknown'
    ? []
    : [{ href: downloads.page, label: 'Autres versions', external: true }]),
]);
</script>

<HomeBox
  title="Vos traductions françaises, directement sur F95zone"
  description="L’extension enrichit les fils F95zone et LewdCorner : statut des traductions, filtres puissants, notifications et lien avec le site F95 France."
  {buttons}
  classes="flex items-center justify-center lg:order-first"
  masterClasses="min-h-120 overflow-hidden lg:p-0"
>
  <!-- Sur petit écran, la maquette passe en fond, comme celles du carrousel au-dessus. -->
  <div
    class="flex h-full w-full items-center justify-center max-lg:absolute max-lg:top-0 max-lg:left-0 max-lg:-z-1 max-lg:opacity-20"
  >
    <!-- Remontée de quelques pixels : inclinée et flottant vers le bas, la maquette paraît sinon trop basse. -->
    <div class="origin-center -translate-y-3 scale-75">
      <MockupExtension {games} />
    </div>
  </div>

  {#snippet details()}
    <!-- Chrome et ses dérivés n'installent pas l'extension d'un clic : il faut la charger à la main. -->
    {#if target === 'chromium'}
      <details
        class="rounded-xl bg-base-100 p-4 text-sm"
        bind:open={installOpen}
      >
        <summary class="cursor-pointer font-bold">
          Comment l'installer sur Chrome, Edge, Brave ou Opera ?
        </summary>
        <ol class="mt-2 flex list-decimal flex-col gap-1.5 ps-5">
          <li>
            Télécharge l'archive <span class="font-bold">.zip</span> avec le
            bouton ci-dessus, puis décompresse-la dans un dossier que tu
            garderas : le navigateur en a besoin tant que l'extension est
            installée.
          </li>
          <li>
            Ouvre la page des extensions en saisissant
            <code class="rounded bg-base-300 px-1 py-0.5 select-all"
              >chrome://extensions</code
            >
            dans la barre d'adresse.
          </li>
          <li>
            Active le <span class="font-bold">Mode développeur</span>, en haut à
            droite de cette page.
          </li>
          <li>
            Clique sur
            <span class="font-bold">Charger l'extension non empaquetée</span>
            et choisis le dossier décompressé.
          </li>
        </ol>
        <p class="mt-2 opacity-70">
          Pour mettre à jour l'extension, remplace le contenu du dossier par
          celui de la nouvelle archive, puis clique sur l'icône d'actualisation
          de l'extension sur cette même page.
        </p>
      </details>
    {/if}
  {/snippet}
</HomeBox>
