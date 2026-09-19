<script lang="ts">
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  Maximize2,
  ScanText,
  Settings,
} from '@lucide/svelte';

interface HomeExtensionMockupGame {
  id: string;
  name: string;
  image: string;
  tversion: string;
  upToDate: boolean;
}

interface Props {
  games: HomeExtensionMockupGame[];
  /** Dans le hero : pas de perspective/flottement propres (gérés par le parent). */
  heroEmbed?: boolean;
}

let { games, heroEmbed = false }: Props = $props();

const fallbackGames: HomeExtensionMockupGame[] = [
  {
    id: 'fallback-1',
    name: 'Jeu exemple',
    image: 'https://picsum.photos/seed/f95ext-fallback/480/176',
    tversion: 'v1.0',
    upToDate: true,
  },
];

const displayGames = $derived(
  games.filter((g) => g.image?.trim() && g.name?.trim()).length > 0
    ? games.filter((g) => g.image?.trim() && g.name?.trim())
    : fallbackGames,
);

const navItems = [
  { icon: ScanText, active: true, badge: 0 },
  { icon: Bell, active: false, badge: 764 },
  { icon: Settings, active: false, badge: 0 },
  { icon: Maximize2, active: false, badge: 0 },
] as const;
</script>

<div
  class="relative mx-auto w-76 select-none {heroEmbed ? '' : 'perspective-distant'}"
  aria-hidden="true"
  inert
>
  <div
    class="absolute pointer-events-none inset-[6%_-12%_-6%] rounded-4xl bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklab,var(--color-secondary)_42%,transparent),transparent_70%)] blur-[20px]"
  ></div>

  <div
    class="relative flex h-135 w-76 flex-col overflow-hidden rounded-lg border border-ext-border bg-ext-background text-ext-secondary-foreground shadow-[0_28px_56px_-14px_color-mix(in_oklab,var(--color-neutral)_55%,transparent)] {heroEmbed ? '' : 'animate-float-sheet-reverse'}"
  >
    <div
      class="flex overflow-hidden relative flex-col flex-1 gap-2 p-2 pt-0 min-h-0"
    >
      <div
        class="sticky top-0 z-10 p-2 pb-8 mx-0.5 text-center rounded-b-xl border border-ext-border bg-ext-card"
      >
        <p class="leading-snug text-[0.65rem] text-ext-secondary-foreground">
          Traduction détectée sur cette page
        </p>
        <div class="flex absolute right-0 top-8 justify-center w-full">
          <div
            class="flex justify-center items-center px-4 py-2 rounded-full border-2 transition-opacity border-ext-border bg-ext-card/40 text-ext-secondary-foreground hover:bg-ext-card/80"
          >
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
          </div>
        </div>
      </div>

      <div class="flex overflow-hidden flex-col flex-1 gap-2 min-h-0">
        {#each displayGames as game (game.id)}
          <div
            class="overflow-hidden relative rounded-md h-22 shrink-0 bg-ext-card"
          >
            <img
              src={game.image}
              alt=""
              class="object-cover absolute inset-0 size-full"
              loading="lazy"
              draggable="false"
            >
            <div
              class="flex relative flex-col justify-end p-6 h-full backdrop-brightness-90 transition text-ext-secondary-foreground hover:backdrop-brightness-100"
            >
              <p
                class="text-sm font-semibold leading-tight select-none line-clamp-1"
              >
                {game.name}
              </p>
              <p
                class="z-20 text-xs font-bold"
                class:text-green-700={game.upToDate}
                class:text-red-700={!game.upToDate}
              >
                {game.tversion}
              </p>
            </div>
            <div
              class="absolute top-1 right-1 p-2 rounded-full opacity-30 text-ext-secondary-foreground"
            >
              <ClipboardCheck
                class="size-6"
                strokeWidth={2}
                aria-hidden="true"
              />
            </div>
          </div>
        {/each}
      </div>

      <div class="flex absolute right-0 bottom-0 left-0 justify-center pb-4">
        <div
          class="bottom-2 z-10 px-4 py-1.5 mx-auto mt-auto text-xs font-medium text-center rounded-md border-2 shadow-sm w-fit border-ext-border bg-ext-card/80 text-ext-secondary-foreground hover:bg-ext-card"
        >
          Filtrer
        </div>
      </div>
    </div>

    <div
      class="flex gap-2 justify-around p-1 w-full h-14 border-t-4 shrink-0 border-ext-border bg-ext-card"
    >
      {#each navItems as item (item.icon)}
        <div
          class="flex relative flex-col flex-1 justify-center items-center py-0.5 rounded-md transition text-ext-secondary-foreground hover:opacity-100"
          class:opacity-50={!item.active}
        >
          {#if item.badge > 0}
            <span
              class="absolute top-0.5 left-1/2 z-10 px-1 leading-tight text-white bg-red-700 rounded-lg text-[0.6rem]"
            >
              {item.badge}
            </span>
          {/if}
          <item.icon
            class="size-6 shrink-0"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
      {/each}
    </div>
  </div>
</div>
