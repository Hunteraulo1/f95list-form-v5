import { requirePermission } from '$lib/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  requirePermission(locals, 'manage.users');
};
