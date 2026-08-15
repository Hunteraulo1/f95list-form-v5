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

<section class="py-8 px-16 xl:px-32 md:h-1/2 flex items-center">
	<div class="flex flex-col lg:grid lg:grid-cols-2 w-full gap-8 lg:mt-16">
		<div class="w-full">
			<h2 class="text-2xl font-bold">
				La communauté française qui fait vivre vos LewdGames en VF
			</h2>
			<p>
				F95 France rassemble traducteurs, relecteurs et joueurs pour
				suivre les sorties, améliorer les traductions et partager chaque
				avancée en français.
			</p>
		</div>
		<div class="w-full flex flex-col items-center gap-4">
			<h5
				class="text-[4vw] lg:text-[2vw] font-black text-base-content/70 uppercase text-center"
			>
				En quelques statistiques
			</h5>
			<div class="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 xl:gap-4">
				{#each stats as { title, value }}
					<div
						class="flex flex-col justify-center items-center w-full bg-base-200 rounded-xl p-2 border border-base-300 shadow-lg"
					>
						<h6
							class="font-bold text-[2vw] sm:text-[1.5vw] lg:text-[.75vw] xl:text-xs uppercase text-base-content/70"
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
