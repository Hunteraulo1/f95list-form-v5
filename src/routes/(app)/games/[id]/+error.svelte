<script lang="ts">
import type { ErrorMessages } from '#lib/components/ui/ErrorPage.svelte';
import ErrorPage from '#lib/components/ui/ErrorPage.svelte';
import { page } from '$app/state';

const MESSAGES: ErrorMessages = {
  403: "Ce jeu n'est plus disponible !",
  404: "Ce jeu n'existe pas !",
};

const message = $derived(MESSAGES[page.status]);
</script>

<ErrorPage {message} />
