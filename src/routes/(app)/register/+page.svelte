<script lang="ts">
import Button from '#lib/components/ui/Button.svelte';
import { EMAIL_MAX_LENGTH, USER_NAME_MAX_LENGTH } from '#lib/profile.ts';
import { enhance } from '$app/forms';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

let submitting = $state(false);

const fieldStyle =
  'shadow-mini h-9 w-full rounded-xl border-2 border-transparent bg-neutral-content px-4 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';

const passwordRules = $derived.by(() => {
  const policy = data.passwordPolicy;
  const needs = [
    policy.uppercase && 'une majuscule',
    policy.lowercase && 'une minuscule',
    policy.number && 'un chiffre',
    policy.symbol && 'un symbole',
  ].filter(Boolean);

  return `Au moins ${policy.minLength} caractères${needs.length ? `, dont ${needs.join(', ')}` : ''}.`;
});

const created = $derived(form && 'created' in form ? form : null);
const error = $derived(form && 'message' in form ? form : null);
</script>

<div class="mx-auto flex max-w-md flex-col gap-4">
  <h1 class="py-4 text-center text-xl font-bold">Créer un compte</h1>

  {#if created}
    <div
      class="flex flex-col items-center gap-3 rounded-xl bg-base-100 p-6 text-center"
      role="status"
    >
      <p class="font-bold">Bienvenue, {created.pseudo} !</p>
      <p class="text-sm opacity-70">
        Ton compte est créé. Un e-mail t'a été envoyé pour vérifier ton adresse.
        Tu peux maintenant te connecter avec ton pseudo ou ton e-mail.
      </p>
      <a
        href="/auth/login"
        data-sveltekit-reload
        data-sveltekit-preload-data="false"
      >
        <Button label="Se connecter" />
      </a>
    </div>
  {:else}
    <form
      method="POST"
      class="flex flex-col gap-3 rounded-xl bg-base-100 p-6"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update({ reset: false });
          submitting = false;
        };
      }}
    >
      <label class="flex flex-col gap-1 text-sm font-bold">
        Pseudo
        <input
          class={fieldStyle}
          type="text"
          name="pseudo"
          value={error?.pseudo ?? ''}
          maxlength={USER_NAME_MAX_LENGTH}
          autocomplete="username"
          required
        >
        <span class="font-normal opacity-70">
          Affiché sur le site, il sert aussi à te connecter.
        </span>
      </label>

      <label class="flex flex-col gap-1 text-sm font-bold">
        Adresse e-mail
        <input
          class={fieldStyle}
          type="email"
          name="email"
          value={error?.email ?? ''}
          maxlength={EMAIL_MAX_LENGTH}
          autocomplete="email"
          required
        >
      </label>

      <label class="flex flex-col gap-1 text-sm font-bold">
        Mot de passe
        <input
          class={fieldStyle}
          type="password"
          name="password"
          autocomplete="new-password"
          minlength={data.passwordPolicy.minLength}
          required
        >
        <span class="font-normal opacity-70">{passwordRules}</span>
      </label>

      <label class="flex flex-col gap-1 text-sm font-bold">
        Confirmer le mot de passe
        <input
          class={fieldStyle}
          type="password"
          name="confirm"
          autocomplete="new-password"
          required
        >
      </label>

      <label class="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="adult"
          class="mt-0.5 size-5 shrink-0 cursor-pointer"
          required
        >
        <span>Je certifie avoir 18 ans ou plus.</span>
      </label>

      {#if error}
        <p class="text-sm font-bold text-error" role="alert">{error.message}</p>
      {/if}

      <div class="flex items-center justify-between gap-2">
        <a
          href="/auth/login"
          class="text-sm underline"
          data-sveltekit-reload
          data-sveltekit-preload-data="false"
        >
          J'ai déjà un compte
        </a>
        <Button
          label={submitting ? 'Envoi…' : 'Créer mon compte'}
          type="submit"
          disabled={submitting}
        />
      </div>
    </form>
  {/if}
</div>
