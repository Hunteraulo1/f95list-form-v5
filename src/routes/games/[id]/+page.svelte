<script lang="ts">
import { onMount } from 'svelte';
import type { PageData } from './$types.js';

interface Props {
  data: PageData;
}

const { data }: Props = $props();

onMount(() => console.log('🚀 ~ data:', data));
</script>

<section>
	<div class="w-full bg-base-100 flex justify-center rounded-xl">
		{data.game.name}
	</div>
</section>
