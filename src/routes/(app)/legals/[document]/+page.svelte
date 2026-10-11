<script lang="ts">
import MarkdownContent from '#lib/components/ui/MarkdownContent.svelte';
import type { PageData } from './$types';

interface Props {
  data: PageData;
}

const { data }: Props = $props();
</script>

<svelte:head>
  <title>{data.title} — F95 France</title>
</svelte:head>

<!-- Le titre vient du document lui-même (son premier titre). -->
<article class="mx-auto max-w-3xl rounded-xl bg-base-100 p-6 md:p-10">
  <MarkdownContent document={data.document} />
</article>
