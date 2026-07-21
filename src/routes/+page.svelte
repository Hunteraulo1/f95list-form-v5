<script lang="ts">
import homeBgDark from '$lib/assets/motif-dark.png';
import homeBgLight from '$lib/assets/motif-light.png';
import Header from '$lib/components/Header.svelte';
import Container from '$lib/components/ui/Container.svelte';
import { getTheme } from '$lib/stores/theme.svelte';

const theme = $derived(getTheme() === 'dark');

interface Stat {
  title: string;
  value: number;
}

const stats: Stat[] = [
  {
    title: 'traducteur',
    value: 115,
  },
  {
    title: 'traductions',
    value: 2048,
  },
  {
    title: 'téléchargements',
    value: 3012,
  },
  {
    title: 'visites',
    value: 1641,
  },
];
</script>

<div class="relative h-128 w-vw max-w-lvw overflow-hidden">
	<div
		class="-inset-1/1 absolute -rotate-16 bg-repeat bg-size-[16rem_auto]"
		style="background-image: url({theme ? homeBgDark : homeBgLight});"
		class:opacity-2={theme}
		class:opacity-4={!theme}
	></div>

	<div
		class="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-base-200 to-transparent"
	></div>
	<div class="relative">
		<Header isHome />
		<section class="py-8 px-16 xl:px-32">
			<div class="grid grid-cols-2 w-full h-full gap-8">
				<div class="w-full">
					<h2 class="text-2xl font-bold">
						La communauté française qui fait vivre vos LewdGames en
						VF
					</h2>
					<p>
						F95 France rassemble traducteurs, relecteurs et joueurs
						pour suivre les sorties, améliorer les traductions et
						partager chaque avancée en français.
					</p>
				</div>
				<div class="w-full flex flex-col items-center gap-4">
					<h5
						class="text-xl xl:text-4xl font-black text-base-content/70 uppercase text-center"
					>
						En quelques statistiques
					</h5>
					<div class="w-full h-full flex justify-between gap-4">
						{#each stats as { title, value }}
							<div
								class="flex flex-col justify-center items-center w-1/4 bg-base-200 rounded-xl p-2"
							>
								<h6
									class="font-bold text-[.75rem] uppercase text-base-content/70"
								>
									{title}
								</h6>
								<p class="text-4xl font-bold text-base-content">
									{value}
								</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>
	</div>
</div>

<Container>
	<section class="-translate-y-32 flex flex-col gap-4">
		<h3 class="text-xl font-bold">Les dernière traductions</h3>
		<div class="grid grid-cols-6 w-full h-60 gap-4">
			<div class="bg-base-300 w-full h-full rounded-xl"></div>
			<div class="bg-base-300 w-full h-full rounded-xl"></div>
			<div class="bg-base-300 w-full h-full rounded-xl"></div>
			<div class="bg-base-300 w-full h-full rounded-xl"></div>
			<div class="bg-base-300 w-full h-full rounded-xl"></div>
			<div class="bg-base-300 w-full h-full rounded-xl"></div>
		</div>
	</section>
</Container>
