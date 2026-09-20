import { requirePermission } from '$lib/server/permissions';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
  requirePermission(locals, 'admin.access');
};
