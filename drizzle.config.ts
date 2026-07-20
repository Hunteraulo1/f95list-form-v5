import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config();

export default defineConfig({
	schema: './src/lib/server/db/schema/index.ts',
	out: './src/lib/server/db/migrations',

	dialect: 'mysql',

	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},

	verbose: true,
	strict: true,
});
