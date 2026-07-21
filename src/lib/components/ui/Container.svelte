<script lang="ts">
const { children, classes = '' } = $props();
</script>

<div
	class={"mx-auto max-x-full px-4 sm:p-0 sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl" +
		classes}
>
	{@render children()}
</div>
