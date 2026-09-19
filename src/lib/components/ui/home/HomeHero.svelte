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

<section class="flex items-center px-16 py-8 xl:px-32 md:h-1/2">
  <div class="flex flex-col gap-8 w-full lg:grid lg:grid-cols-2 lg:mt-16">
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
    <div class="flex flex-col gap-4 items-center w-full">
      <h5
        class="font-black text-center uppercase text-[4vw] lg:text-[2vw] text-base-content/70"
      >
        En quelques statistiques
      </h5>
      <div class="grid grid-cols-2 gap-2 w-full sm:grid-cols-4 xl:gap-4">
        {#each stats as { title, value }}
          <div
            class="flex flex-col justify-center items-center p-2 w-full rounded-xl border shadow-lg bg-base-200 border-base-300"
          >
            <h6
              class="font-bold uppercase text-[2vw] sm:text-[1.5vw] lg:text-[.75vw] xl:text-xs text-base-content/70"
            >
              {title}
            </h6>
            <p
              class="font-bold text-[clamp(1.5rem,4vw,2rem)] text-base-content"
            >
              {format(value)}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
