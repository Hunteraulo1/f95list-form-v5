<script lang="ts">
import Button from '#lib/components/ui/Button.svelte';
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

const error = $derived(form && 'message' in form ? form.message : null);
const sent = $derived(Boolean(form && 'sent' in form));

const submit = () => {
  submitting = true;
  return async ({
    update,
  }: {
    update: (o?: { reset?: boolean }) => Promise<void>;
  }) => {
    await update({ reset: false });
    submitting = false;
  };
};
</script>

<div class="mx-auto flex max-w-md flex-col gap-4">
  <h1 class="py-4 text-center text-xl font-bold">Mot de passe oublié</h1>

  {#if data.link}
    <form
      method="POST"
      action="?/set"
      class="flex flex-col gap-3 rounded-xl bg-base-100 p-6"
      use:enhance={submit}
    >
      <input type="hidden" name="userId" value={data.link.userId}>
      <input type="hidden" name="code" value={data.link.code}>

      <label class="flex flex-col gap-1 text-sm font-bold">
        Nouveau mot de passe
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
        Confirmer le nouveau mot de passe
        <input
          class={fieldStyle}
          type="password"
          name="confirm"
          autocomplete="new-password"
          required
        >
      </label>

      {#if error}
        <p class="text-sm font-bold text-error" role="alert">{error}</p>
      {/if}

      <div class="flex justify-end">
        <Button
          label={submitting ? 'Envoi…' : 'Changer le mot de passe'}
          type="submit"
          disabled={submitting}
        />
      </div>
    </form>
  {:else if sent}
    <p class="rounded-xl bg-base-100 p-6 text-center text-sm" role="status">
      Si un compte correspond, un e-mail avec un lien de réinitialisation vient
      de lui être envoyé.
    </p>
  {:else}
    <form
      method="POST"
      action="?/request"
      class="flex flex-col gap-3 rounded-xl bg-base-100 p-6"
      use:enhance={submit}
    >
      <label class="flex flex-col gap-1 text-sm font-bold">
        Pseudo ou e-mail
        <input
          class={fieldStyle}
          type="text"
          name="login"
          autocomplete="username"
          autocapitalize="none"
          required
        >
        <span class="font-normal opacity-70">
          Un lien pour choisir un nouveau mot de passe sera envoyé à l'adresse
          e-mail du compte. C'est aussi la marche à suivre si tu avais un compte
          sur l'ancien site : tu retrouveras ton profil et tes traductions.
        </span>
      </label>

      {#if error}
        <p class="text-sm font-bold text-error" role="alert">{error}</p>
      {/if}

      <div class="flex items-center justify-between gap-2">
        <a
          href="/auth/login"
          class="text-sm underline"
          data-sveltekit-reload
          data-sveltekit-preload-data="off"
        >
          Retour à la connexion
        </a>
        <Button
          label={submitting ? 'Envoi…' : 'Envoyer le lien'}
          type="submit"
          disabled={submitting}
        />
      </div>
    </form>
  {/if}
</div>
