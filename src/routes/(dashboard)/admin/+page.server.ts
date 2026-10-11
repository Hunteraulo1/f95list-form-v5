import { AdminLink, orm } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
  //? Raccourcis vers les outils de l'équipe, réglés sur /admin/settings.
  links: (
    await orm.em.find(
      AdminLink,
      {},
      { orderBy: { position: 'asc', createdAt: 'asc' } },
    )
  ).map((link) => ({
    id: link.id,
    label: link.label,
    description: link.description ?? null,
    url: link.url,
  })),
  canManageLinks: locals.user?.permissions.includes('manage.settings') ?? false,
});
