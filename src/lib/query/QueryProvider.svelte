<script lang="ts">
import { QueryClientProvider } from '@tanstack/svelte-query';

import { queryClient } from './client';

let { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
</QueryClientProvider>
