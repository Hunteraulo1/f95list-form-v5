<script lang="ts">
import { Pause, Play } from '@lucide/svelte';
import HomeBox from '$lib/components/ui/home/HomeBox.svelte';
import MockupFlip from '$lib/components/ui/home/mockups/MockupFlip.svelte';

let activeSlide = $state(0);
let toogleSlide = $state(true);

let interval: ReturnType<typeof setInterval> | undefined;

$effect(() => {
  if (toogleSlide) {
    interval = setInterval(() => {
      activeSlide = activeSlide < slides.length - 1 ? activeSlide + 1 : 0;
    }, 10 * 1000);
  }

  return () => clearInterval(interval);
});

interface HeroCta {
  href: string;
  label: string;
  external?: boolean;
}

interface HeroSlide {
  id: string;
  label: string;
  title: string;
  lead: string;
  buttons: HeroCta[];
  mockup: string;
}

const slides: HeroSlide[] = [
  {
    id: 'vf',
    label: 'Traductions',
    title: 'La communauté française qui fait vivre vos LewdGames en VF',
    lead: 'F95 France rassemble traducteurs, relecteurs et joueurs pour suivre les sorties, améliorer les traductions et partager chaque avancée en français.',
    buttons: [
      { href: '/games', label: 'Explorer les jeux' },
      {
        href: 'https://tableau-traduction.f95france.site',
        label: 'Accèder au tableur',
        external: true,
      },
    ],
    mockup: 'sheet',
  },
  {
    id: 'discord',
    label: 'Discord',
    title: 'Échangez avec la communauté sur notre Discord',
    lead: 'Annonces des mises à jour, entraide traduction, discussions entre joueurs et suivi des sorties en temps réel avec l’équipe.',
    buttons: [
      {
        href: 'https://discord.f95france.site',
        label: 'Rejoindre le serveur',
        external: true,
      },
    ],
    mockup: 'discord',
  },
  // TODO: Uncomment when Wiki is back online
  {
    id: 'wiki',
    label: 'Wiki',
    title: 'Tout savoir grace au wiki de F95 France',
    lead: 'Guides, tutoriels et documentation pour comprendre le site, contribuer aux traductions et tirer le meilleur parti des outils de la communauté.',
    buttons: [
      {
        href: 'https://wiki.f95france.site',
        label: 'Consulter le wiki',
        external: true,
      },
    ],
    mockup: 'wiki',
  },
];
</script>

<HomeBox
  title={slides[activeSlide].title}
  description={slides[activeSlide].lead}
  buttons={slides[activeSlide].buttons}
  classes="pb-4 flex lg:flex-col flex-col-reverse"
  masterClasses="min-h-120 overflow-hidden"
>
  <div
    class="p-8 w-full h-full max-lg:absolute lg:relative max-lg:top-0 max-lg:left-0 max-lg:opacity-20 max-lg:-z-1"
  >
    <MockupFlip {slides} {activeSlide}></MockupFlip>
  </div>
  <div class="flex absolute left-0 bottom-8 gap-2 justify-center w-full">
    {#each slides as _, index}
      <button
        type="button"
        aria-label="slide {index}"
        class="rounded-full border bg-base-300 border-bg-base-200 size-4 hover:bg-primary/50"
        class:bg-primary={index === activeSlide}
        onclick={() => (activeSlide = index)}
      ></button>
    {/each}
    <button
      type="button"
      aria-label="toggle"
      class="hover:text-primary"
      onclick={() => {
  toogleSlide = !toogleSlide;
}}
    >
      {#if toogleSlide}
        <Play size="16" />
      {:else}
        <Pause size="16" />
      {/if}
    </button>
  </div>
</HomeBox>
