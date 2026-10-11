<script lang="ts">
import { HatGlasses, Scale } from '@lucide/svelte';

const links = [
  { href: '/legals/legal-notice', label: 'Mentions légales', icon: Scale },
  {
    href: '/legals/privacy-policy',
    label: 'Politique de confidentialité',
    icon: HatGlasses,
  },
];
</script>

<footer
  class="flex flex-col items-center gap-3 bg-base-200 px-4 py-8 font-[Fustat] text-base-content"
>
  <nav aria-label="Informations légales">
    <ul class="flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
      {#each links as link (link.href)}
        <li>
          <a
            href={link.href}
            class="flex items-center gap-2 text-xs hover:text-primary"
          >
            <link.icon size="20" aria-hidden="true" />
            {link.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
  <p class="text-xs text-base-content/80">
    © {new Date().getFullYear()} F95 France — Tous droits réservés
  </p>
</footer>
