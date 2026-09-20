<script lang="ts">
import ProfileView from '$lib/components/profile/ProfileView.svelte';
import type { PageData } from './$types';

interface Props {
  data: PageData;
}

const { data }: Props = $props();
</script>

<svelte:head>
  <title>{data.profile.name} - F95 France</title>
</svelte:head>

<ProfileView
  profile={data.profile}
  descriptionDocument={data.descriptionDocument}
  translations={data.translations}
  query={data.query}
  basePath="/profile/{data.profile.slug}"
/>
