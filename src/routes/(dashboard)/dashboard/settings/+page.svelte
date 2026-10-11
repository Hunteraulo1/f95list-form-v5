<script lang="ts">
import Button from '#lib/components/ui/Button.svelte';
import { type ThemePreference, USER_NAME_MAX_LENGTH } from '#lib/profile.ts';
import { applyThemePreference } from '#lib/stores/theme.svelte.ts';
import { enhance } from '$app/forms';
import { page } from '$app/state';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

type Section = 'account' | 'preferences';

const settings = $derived(data.settings);
const impersonating = $derived(Boolean(page.data.impersonator));

let submitting = $state<Section | null>(null);

const fieldStyle =
  'shadow-mini h-9 w-full rounded-xl border-2 border-transparent bg-neutral-content px-4 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';

const themes: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

const errorOf = (section: Section) =>
  form && 'message' in form && form.section === section ? form.message : null;
const savedOf = (section: Section) =>
  Boolean(form && 'saved' in form && form.saved === section);
</script>

<div class="flex flex-col gap-4">
  {#if impersonating}
    <p class="rounded-xl bg-base-100 p-4 text-sm">
      La modification des paramètres est désactivée en naviguant en tant qu'un
      autre compte.
    </p>
  {/if}

  <section class="flex flex-col gap-2 rounded-xl bg-base-100 p-4">
    <h2 class="font-bold">Mon compte</h2>

    <form
      method="POST"
      action="?/account"
      class="flex flex-col gap-3"
      use:enhance={() => {
        submitting = 'account';
        return async ({ update }) => {
          await update({ reset: false });
          submitting = null;
        };
      }}
    >
      <label class="flex flex-col gap-1 text-sm font-bold">
        Pseudo
        <input
          class={fieldStyle}
          type="text"
          name="name"
          value={settings.name}
          maxlength={USER_NAME_MAX_LENGTH}
          required
          disabled={impersonating}
        >
        <span class="font-normal opacity-70">
          Il fabrique le lien de ton profil (actuellement
          <a class="underline" href="/profile/{settings.slug}">
            /profile/{settings.slug}
          </a>
          ) : en changer change ce lien, et l'ancien ne fonctionnera plus.
        </span>
      </label>

      <label class="flex flex-col gap-1 text-sm font-bold">
        Identifiant Discord
        <input
          class={fieldStyle}
          type="text"
          name="discord"
          value={settings.discord ?? ''}
          inputmode="numeric"
          maxlength="32"
          placeholder="Ex : 123456789012345678"
          disabled={impersonating}
        >
        <span class="font-normal opacity-70">
          L'identifiant numérique de ton compte (pas ton pseudo Discord). Laisse
          vide pour le retirer.
        </span>
      </label>

      <label class="flex flex-col gap-1 text-sm font-bold">
        E-mail
        <input
          class="{fieldStyle} cursor-not-allowed opacity-60"
          type="email"
          value={settings.email ?? ''}
          placeholder="Aucun e-mail"
          disabled
        >
        <span class="font-normal opacity-70">
          L'e-mail est celui de ta connexion : il ne se modifie pas ici.
        </span>
      </label>

      {#if errorOf('account')}
        <p class="text-sm font-bold text-error" role="alert">
          {errorOf('account')}
        </p>
      {:else if savedOf('account')}
        <p class="text-sm font-bold text-success" role="status">
          Compte enregistré.
        </p>
      {/if}

      <div class="flex justify-end">
        <Button
          label={submitting === 'account' ? 'Envoi…' : 'Enregistrer'}
          type="submit"
          disabled={impersonating || submitting !== null}
        />
      </div>
    </form>
  </section>

  <section class="flex flex-col gap-2 rounded-xl bg-base-100 p-4">
    <h2 class="font-bold">Préférences</h2>

    <form
      method="POST"
      action="?/preferences"
      class="flex flex-col gap-3"
      use:enhance={() => {
        submitting = 'preferences';
        return async ({ result, update }) => {
          await update({ reset: false });
          submitting = null;

          if (result.type === 'success' && result.data?.theme) {
            applyThemePreference(result.data.theme as ThemePreference);
          }
        };
      }}
    >
      <fieldset class="flex flex-col gap-1 text-sm">
        <legend class="mb-1 font-bold">Thème</legend>
        <div class="flex flex-wrap gap-2">
          {#each themes as theme (theme.value)}
            <label
              class="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-transparent bg-base-200 px-4 py-2 font-bold hover:border-primary has-checked:border-primary has-disabled:cursor-not-allowed"
            >
              <input
                type="radio"
                name="theme"
                value={theme.value}
                checked={settings.theme === theme.value}
                disabled={impersonating}
              >
              {theme.label}
            </label>
          {/each}
        </div>
        <span class="opacity-70">
          Appliqué sur tous tes appareils. Le bouton de l'en-tête ne change le
          thème que sur l'appareil où tu cliques.
        </span>
      </fieldset>

      <label class="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="discordNotification"
          class="mt-1 size-5 shrink-0 cursor-pointer"
          checked={settings.discordNotification}
          disabled={impersonating}
        >
        <span>
          <span class="block font-bold">Notifications Discord</span>
          <span class="block opacity-70">
            Être mentionné sur Discord pour ce qui concerne mes traductions.
          </span>
        </span>
      </label>

      {#if errorOf('preferences')}
        <p class="text-sm font-bold text-error" role="alert">
          {errorOf('preferences')}
        </p>
      {:else if savedOf('preferences')}
        <p class="text-sm font-bold text-success" role="status">
          Préférences enregistrées.
        </p>
      {/if}

      <div class="flex justify-end">
        <Button
          label={submitting === 'preferences' ? 'Envoi…' : 'Enregistrer'}
          type="submit"
          disabled={impersonating || submitting !== null}
        />
      </div>
    </form>
  </section>
</div>
