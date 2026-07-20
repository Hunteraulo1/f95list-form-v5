import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		runes: ({ filename }: { filename: string }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
	},

	kit: {
		adapter: adapter(),

		alias: {
			$features: './src/features',
		},
	},
};

export default config;
