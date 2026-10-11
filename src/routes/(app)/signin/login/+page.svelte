<script lang="ts">
import { tick } from 'svelte';
import Button from '#lib/components/ui/Button.svelte';
import { submitForm } from '#lib/utils/form.ts';
import { enhance } from '$app/forms';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

let submitting = $state(false);
let keyError = $state<string | null>(null);
let assertion = $state('');
//? Connexion validée : l'adresse de l'application où repartir (voir `finish` côté serveur).
let callback = $state<string | null>(null);

const fieldStyle =
  'shadow-mini h-9 w-full rounded-xl border-2 border-transparent bg-neutral-content px-4 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';

const actionUrl = (name: string) =>
  `?/${name}&authRequest=${encodeURIComponent(data.authRequest)}`;
const error = $derived(form && 'message' in form ? form.message : null);

//? Commun à tous les formulaires : en cas de succès final, on quitte la page pour l'application.
const submit = () => {
  submitting = true;
  keyError = null;

  return async ({
    result,
    update,
  }: {
    result: { type: string; data?: Record<string, unknown> };
    update: (options?: { reset?: boolean }) => Promise<void>;
  }) => {
    if (
      result.type === 'success' &&
      typeof result.data?.callback === 'string'
    ) {
      callback = result.data.callback;
      window.location.assign(callback);
      return;
    }

    await update({ reset: false });
    submitting = false;
  };
};

const fromBase64Url = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (char) =>
    char.charCodeAt(0),
  );
const toBase64Url = (buffer: ArrayBuffer | null) =>
  buffer
    ? btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    : undefined;

interface KeyOptions {
  challenge: string;
  allowCredentials?: { id: string; type: 'public-key' }[];
  [key: string]: unknown;
}

//? Fait signer le défi de Zitadel par la clé de sécurité, puis envoie sa réponse.
const useKey = async (options: KeyOptions) => {
  try {
    const credential = (await navigator.credentials.get({
      publicKey: {
        ...options,
        challenge: fromBase64Url(options.challenge),
        allowCredentials: options.allowCredentials?.map((item) => ({
          ...item,
          id: fromBase64Url(item.id),
        })),
      } as unknown as PublicKeyCredentialRequestOptions,
    })) as PublicKeyCredential | null;
    if (!credential) throw new Error('aucune clé');

    const response = credential.response as AuthenticatorAssertionResponse;
    assertion = JSON.stringify({
      id: credential.id,
      rawId: toBase64Url(credential.rawId),
      type: credential.type,
      response: {
        authenticatorData: toBase64Url(response.authenticatorData),
        clientDataJSON: toBase64Url(response.clientDataJSON),
        signature: toBase64Url(response.signature),
        userHandle: toBase64Url(response.userHandle),
      },
    });
    await tick();
    submitForm('key-verify-form');
  } catch {
    keyError =
      "La clé de sécurité n'a pas répondu : opération annulée, ou clé inconnue de ce compte.";
  }
};
</script>

<div class="mx-auto flex max-w-md flex-col gap-4">
  <h1 class="py-4 text-center text-xl font-bold">Se connecter</h1>

  {#if callback}
    <div
      class="flex flex-col items-center gap-3 rounded-xl bg-base-100 p-6 text-center"
      role="status"
    >
      <p class="font-bold">Connexion réussie.</p>
      <a href={callback} class="text-sm underline">Continuer</a>
    </div>
  {:else if data.secondFactors}
    <div class="flex flex-col gap-4 rounded-xl bg-base-100 p-6">
      <p class="text-sm">
        Mot de passe vérifié. Confirme maintenant avec ton second facteur.
      </p>

      {#if data.secondFactors.totp}
        <form
          method="POST"
          action={actionUrl('totp')}
          class="flex flex-col gap-3"
          use:enhance={submit}
        >
          <label class="flex flex-col gap-1 text-sm font-bold">
            Code de l'application d'authentification
            <input
              class="{fieldStyle} max-w-40 tracking-widest"
              type="text"
              name="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="7"
              placeholder="000000"
              required
            >
          </label>
          <div>
            <Button
              label={submitting ? 'Envoi…' : 'Valider le code'}
              type="submit"
              disabled={submitting}
            />
          </div>
        </form>
      {/if}

      {#if data.secondFactors.key}
        <form
          method="POST"
          action={actionUrl('keyStart')}
          use:enhance={() => {
            const done = submit();

            return async (event) => {
              if (event.result.type === 'success' && event.result.data?.key) {
                await useKey(event.result.data.key as KeyOptions);
                submitting = false;
                return;
              }

              await done(event);
            };
          }}
        >
          <Button
            label={data.secondFactors.totp
              ? 'Utiliser plutôt une clé de sécurité'
              : 'Utiliser ma clé de sécurité'}
            type="submit"
            inline={data.secondFactors.totp}
            disabled={submitting}
          />
        </form>

        <!-- Envoyé par `useKey` une fois que la clé a répondu. -->
        <form
          id="key-verify-form"
          method="POST"
          action={actionUrl('keyVerify')}
          hidden
          use:enhance={submit}
        >
          <input type="hidden" name="assertion" value={assertion}>
        </form>
      {/if}

      {#if keyError || error}
        <p class="text-sm font-bold text-error" role="alert">
          {keyError ?? error}
        </p>
      {/if}

      <form method="POST" action={actionUrl('cancel')} use:enhance={submit}>
        <button type="submit" class="cursor-pointer text-sm underline">
          Utiliser un autre compte
        </button>
      </form>
    </div>
  {:else}
    {#if data.notice}
      <p class="rounded-xl bg-base-100 p-4 text-sm" role="status">
        {data.notice}
      </p>
    {/if}

    <form
      method="POST"
      action={actionUrl('password')}
      class="flex flex-col gap-3 rounded-xl bg-base-100 p-6"
      use:enhance={submit}
    >
      <label class="flex flex-col gap-1 text-sm font-bold">
        Pseudo ou e-mail
        <input
          class={fieldStyle}
          type="text"
          name="login"
          value={(form && 'login' in form ? form.login : null) ??
            data.loginHint ??
            ''}
          autocomplete="username"
          autocapitalize="none"
          required
        >
      </label>

      <label class="flex flex-col gap-1 text-sm font-bold">
        Mot de passe
        <input
          class={fieldStyle}
          type="password"
          name="password"
          autocomplete="current-password"
          required
        >
      </label>

      {#if error}
        <p class="text-sm font-bold text-error" role="alert">{error}</p>
      {/if}

      <div class="flex items-center justify-between gap-2">
        <a href="/signin/reset" class="text-sm underline">
          Mot de passe oublié ?
        </a>
        <Button
          label={submitting ? 'Envoi…' : 'Se connecter'}
          type="submit"
          disabled={submitting}
        />
      </div>
    </form>

    {#if data.discord}
      <!-- Un lien, pas un formulaire : la politique de sécurité interdit à un formulaire de mener hors du site. -->
      <a
        href="/signin/discord?authRequest={encodeURIComponent(
          data.authRequest,
        )}"
        class="flex justify-center rounded-xl bg-base-100 p-4 text-sm font-bold hover:bg-base-300"
        data-sveltekit-reload
        data-sveltekit-preload-data="off"
      >
        Se connecter avec Discord
      </a>
    {/if}

    <p class="text-center text-sm">
      Pas encore de compte ?
      <a href="/register" class="underline">Créer un compte</a>
    </p>
  {/if}
</div>
