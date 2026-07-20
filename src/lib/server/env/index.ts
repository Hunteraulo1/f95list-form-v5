import { env } from '$env/dynamic/private';
import * as v from 'valibot';

import {
  envSchema
} from './schema';

const result = v.safeParse(
	envSchema,
	env
);

if (!result.success) {
	console.error(
		'❌ Invalid environment variables',
		result.issues
	);

	throw new Error(
		'Invalid environment variables'
	);
}

export const envConfig = result.output;
