<script lang="ts">
interface Props {
  stats: {
    title: string;
    value: number;
  }[];
}

const { stats }: Props = $props();

const { format } = new Intl.NumberFormat('fr', { notation: 'compact' });
</script>

<section class="flex items-center px-16 py-8 md:h-1/2 xl:px-32">
  <div class="flex w-full flex-col gap-8 lg:mt-16 lg:grid lg:grid-cols-2">
    <div class="w-full">
      <h2 class="text-2xl font-bold">
        La communauté française qui fait vivre vos LewdGames en VF
      </h2>
      <p>
        F95 France rassemble traducteurs, relecteurs et joueurs pour suivre les
        sorties, améliorer les traductions et partager chaque avancée en
        français.
      </p>
    </div>
    <div class="flex w-full flex-col items-center gap-4">
      <h5
        class="text-center text-[4vw] font-black text-base-content/70 uppercase lg:text-[2vw]"
      >
        En quelques statistiques
      </h5>
      <div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 xl:gap-4">
        {#each stats as { title, value }}
          <div
            class="flex w-full flex-col items-center justify-center rounded-xl border border-base-300 bg-base-200 p-2 shadow-lg"
          >
            <h6
              class="text-[2vw] font-bold text-base-content/70 uppercase sm:text-[1.5vw] lg:text-[.75vw] xl:text-xs"
            >
              {title}
            </h6>
            <p
              class="text-[clamp(1.5rem,4vw,2rem)] font-bold text-base-content"
            >
              {format(value)}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
