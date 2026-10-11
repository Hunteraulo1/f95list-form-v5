<script lang="ts">
import { tick } from 'svelte';
import Button from '#lib/components/ui/Button.svelte';
import Modal from '#lib/components/ui/Modal.svelte';
import {
  EMAIL_MAX_LENGTH,
  type ThemePreference,
  USER_NAME_MAX_LENGTH,
} from '#lib/profile.ts';
import { applyThemePreference } from '#lib/stores/theme.svelte.ts';
import { submitForm } from '#lib/utils/form.ts';
import { enhance } from '$app/forms';
import { page } from '$app/state';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

type Section =
  | 'account'
  | 'discord'
  | 'email'
  | 'password'
  | 'totp'
  | 'keys'
  | 'passkeys'
  | 'preferences';

const settings = $derived(data.settings);
//? Nul quand l'e-mail et le mot de passe ne se gèrent pas ici (compte non lié à Zitadel).
const account = $derived(data.account);
const passwordRules = $derived.by(() => {
  if (!account) return '';

  const policy = account.passwordPolicy;
  const needs = [
    policy.uppercase && 'une majuscule',
    policy.lowercase && 'une minuscule',
    policy.number && 'un chiffre',
    policy.symbol && 'un symbole',
  ].filter(Boolean);

  return `Au moins ${policy.minLength} caractères${needs.length ? `, dont ${needs.join(', ')}` : ''}.`;
});
const impersonating = $derived(Boolean(page.data.impersonator));
//? `undefined` : Discord ne passe pas par Zitadel, l'identifiant se saisit à la main. Sinon le
//? compte Discord lié (nul s'il n'y en a pas).
const discordLink = $derived(data.discordLink);

//? Issue de « Lier mon compte Discord », au retour de Discord (voir `/auth/discord/callback`).
const discordNotices: Record<string, { error: boolean; text: string }> = {
  linked: { error: false, text: 'Compte Discord lié.' },
  taken: {
    error: true,
    text: 'Ce compte Discord est déjà lié à un autre compte.',
  },
  failed: {
    error: true,
    text: "La liaison avec Discord n'a pas abouti : réessaie.",
  },
};
const discordNotice = $derived(
  discordNotices[page.url.searchParams.get('discord') ?? ''] ?? null,
);

let submitting = $state<Section | null>(null);

const fieldStyle =
  'shadow-mini h-9 w-full rounded-xl border-2 border-transparent bg-neutral-content px-4 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';

const themes: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

//? Enrôlement d'une application d'authentification en cours : le secret à lui donner, reçu une
//? seule fois du serveur. Il disparaît dès que le code est confirmé ou qu'on annule.
let totpSetup = $state<{ secret: string; qr: string } | null>(null);
let keyName = $state('');
let keyModalOpen = $state(false);
//? Ce qu'on est en train d'ajouter : une clé de sécurité (second facteur) ou une clé d'accès
//? (connexion sans mot de passe). Les deux suivent le même parcours.
let keyKind = $state<'key' | 'passkey'>('key');
const keySection = $derived(keyKind === 'passkey' ? 'passkeys' : 'keys');
let keyError = $state<string | null>(null);
let pendingKey = $state<{ id: string; credential: string } | null>(null);

const fromBase64Url = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (char) =>
    char.charCodeAt(0),
  );
const toBase64Url = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

interface KeyOptions {
  challenge: string;
  user: { id: string; name: string; displayName: string };
  excludeCredentials?: { id: string; type: 'public-key' }[];
  [key: string]: unknown;
}

//? Fait dialoguer le navigateur avec la clé de sécurité, puis envoie sa réponse au serveur (les
//? options reçues et la réponse voyagent en JSON : les champs binaires y sont en base64url).
const registerKey = async (key: { id: string; options: KeyOptions }) => {
  keyError = null;

  try {
    const created = (await navigator.credentials.create({
      publicKey: {
        ...key.options,
        challenge: fromBase64Url(key.options.challenge),
        user: { ...key.options.user, id: fromBase64Url(key.options.user.id) },
        excludeCredentials: key.options.excludeCredentials?.map((item) => ({
          ...item,
          id: fromBase64Url(item.id),
        })),
      } as unknown as PublicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;
    if (!created) throw new Error('aucune clé');

    const response = created.response as AuthenticatorAttestationResponse;
    pendingKey = {
      id: key.id,
      credential: JSON.stringify({
        id: created.id,
        rawId: toBase64Url(created.rawId),
        type: created.type,
        response: {
          attestationObject: toBase64Url(response.attestationObject),
          clientDataJSON: toBase64Url(response.clientDataJSON),
        },
      }),
    };
    await tick();
    submitForm('key-verify-form');
  } catch {
    //? Annulation, délai dépassé, ou clé refusée par le navigateur pour ce site.
    keyError =
      "La clé de sécurité n'a pas pu être enregistrée : opération annulée, ou clé non acceptée par le navigateur sur ce site.";
  }
};

const errorOf = (section: Section) =>
  form && 'message' in form && form.section === section ? form.message : null;
const savedOf = (section: Section) =>
  Boolean(form && 'saved' in form && form.saved === section);
const removedOf = (section: Section) =>
  Boolean(form && 'removed' in form && form.removed === section);
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

      {#if discordLink === undefined}
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
            L'identifiant numérique de ton compte (pas ton pseudo Discord).
            Laisse vide pour le retirer.
          </span>
        </label>
      {/if}

      {#if !account}
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
      {/if}

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

  {#if discordLink !== undefined}
    <section class="flex flex-col gap-3 rounded-xl bg-base-100 p-4">
      <div class="flex flex-col gap-1">
        <h2 class="font-bold">Compte Discord</h2>
        <p class="text-sm opacity-70">
          Lié, il permet de se connecter avec Discord et donne ton identifiant
          Discord au site.
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
        {#if discordLink}
          <p>
            Lié à
            <span class="font-bold">{discordLink.userName ?? 'un compte'}</span>
            <span class="opacity-70">({discordLink.userId})</span>
          </p>
          <form
            method="POST"
            action="?/discordUnlink"
            use:enhance={({ cancel }) => {
              if (
                !confirm(
                  'Délier ce compte Discord ? Tu ne pourras plus te connecter avec Discord.',
                )
              ) {
                cancel();
                return;
              }

              submitting = 'discord';
              return async ({ update }) => {
                await update({ reset: false });
                submitting = null;
              };
            }}
          >
            <Button
              label="Délier"
              type="submit"
              inline
              disabled={impersonating || submitting !== null}
            />
          </form>
        {:else}
          <p>
            Aucun compte Discord lié.
            {#if settings.discord}
              <span class="opacity-70">
                Identifiant repris de l'ancien site : {settings.discord}.
              </span>
            {/if}
          </p>
          {#if !impersonating}
            <!-- Un lien, pas un formulaire : la politique de sécurité interdit à un formulaire de mener hors du site. -->
            <a
              href="/auth/discord/link"
              data-sveltekit-reload
              data-sveltekit-preload-data="off"
            >
              <Button label="Lier mon compte Discord" />
            </a>
          {/if}
        {/if}
      </div>

      {#if errorOf('discord')}
        <p class="text-sm font-bold text-error" role="alert">
          {errorOf('discord')}
        </p>
      {:else if removedOf('discord')}
        <p class="text-sm font-bold text-success" role="status">
          Compte Discord délié.
        </p>
      {:else if discordNotice}
        <p
          class="text-sm font-bold"
          class:text-error={discordNotice.error}
          class:text-success={!discordNotice.error}
          role={discordNotice.error ? 'alert' : 'status'}
        >
          {discordNotice.text}
        </p>
      {/if}
    </section>
  {/if}

  {#if account}
    <section class="flex flex-col gap-2 rounded-xl bg-base-100 p-4">
      <h2 class="font-bold">E-mail</h2>

      <form
        method="POST"
        action="?/email"
        class="flex flex-col gap-3"
        use:enhance={() => {
          submitting = 'email';
          return async ({ update }) => {
            await update({ reset: false });
            submitting = null;
          };
        }}
      >
        <label class="flex flex-col gap-1 text-sm font-bold">
          Adresse e-mail
          <input
            class={fieldStyle}
            type="email"
            name="email"
            value={settings.email ?? ''}
            maxlength={EMAIL_MAX_LENGTH}
            autocomplete="email"
            required
            disabled={impersonating}
          >
          <span class="font-normal opacity-70">
            {#if settings.email && !account.emailVerified}
              <span class="font-bold text-warning">
                Adresse pas encore vérifiée :
              </span>
              suis le lien reçu par e-mail pour la confirmer.
            {:else}
              Un e-mail de vérification est envoyé à la nouvelle adresse : elle
              n'est prise en compte qu'une fois confirmée.
            {/if}
          </span>
        </label>

        {#if errorOf('email')}
          <p class="text-sm font-bold text-error" role="alert">
            {errorOf('email')}
          </p>
        {:else if savedOf('email')}
          <p class="text-sm font-bold text-success" role="status">
            E-mail de vérification envoyé à la nouvelle adresse.
          </p>
        {/if}

        <div class="flex justify-end">
          <Button
            label={submitting === 'email' ? 'Envoi…' : "Changer l'e-mail"}
            type="submit"
            disabled={impersonating || submitting !== null}
          />
        </div>
      </form>
    </section>

    {#if account.hasPassword}
      <section class="flex flex-col gap-2 rounded-xl bg-base-100 p-4">
        <h2 class="font-bold">Mot de passe</h2>

        <form
          method="POST"
          action="?/password"
          class="flex flex-col gap-3"
          use:enhance={() => {
            submitting = 'password';
            return async ({ result, update }) => {
              //? Les mots de passe ne restent dans les champs qu'en cas d'erreur.
              await update({ reset: result.type === 'success' });
              submitting = null;
            };
          }}
        >
          <label class="flex flex-col gap-1 text-sm font-bold">
            Mot de passe actuel
            <input
              class={fieldStyle}
              type="password"
              name="current"
              autocomplete="current-password"
              required
              disabled={impersonating}
            >
          </label>

          <label class="flex flex-col gap-1 text-sm font-bold">
            Nouveau mot de passe
            <input
              class={fieldStyle}
              type="password"
              name="next"
              autocomplete="new-password"
              minlength={account.passwordPolicy.minLength}
              required
              disabled={impersonating}
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
              disabled={impersonating}
            >
          </label>

          {#if errorOf('password')}
            <p class="text-sm font-bold text-error" role="alert">
              {errorOf('password')}
            </p>
          {:else if savedOf('password')}
            <p class="text-sm font-bold text-success" role="status">
              Mot de passe modifié.
            </p>
          {/if}

          <div class="flex justify-end">
            <Button
              label={submitting === 'password'
                ? 'Envoi…'
                : 'Changer le mot de passe'}
              type="submit"
              disabled={impersonating || submitting !== null}
            />
          </div>
        </form>
      </section>
    {/if}

    <section class="flex flex-col gap-4 rounded-xl bg-base-100 p-4">
      <div class="flex flex-col gap-1">
        <h2 class="font-bold">Double authentification</h2>
        <p class="text-sm opacity-70">
          Un second facteur est demandé à la connexion, en plus du mot de passe.
        </p>
      </div>

      <div class="flex flex-col gap-3 rounded-xl bg-base-200 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-sm">
            <h3 class="font-bold">Application d'authentification</h3>
            <p class="opacity-70">
              {account.security.totp
                ? 'Activée : un code à 6 chiffres est demandé à la connexion.'
                : 'Codes à 6 chiffres générés par une application (Aegis, Google Authenticator, Bitwarden…).'}
            </p>
          </div>

          {#if account.security.totp}
            <form
              method="POST"
              action="?/totpRemove"
              use:enhance={({ cancel }) => {
                if (
                  !confirm(
                    "Désactiver l'application d'authentification ? Les codes ne seront plus demandés à la connexion.",
                  )
                ) {
                  cancel();
                  return;
                }

                submitting = 'totp';
                return async ({ update }) => {
                  await update({ reset: false });
                  submitting = null;
                };
              }}
            >
              <Button
                label="Désactiver"
                type="submit"
                inline
                disabled={impersonating || submitting !== null}
              />
            </form>
          {:else if !totpSetup}
            <form
              method="POST"
              action="?/totpStart"
              use:enhance={() => {
                submitting = 'totp';
                return async ({ result, update }) => {
                  await update({ reset: false });
                  submitting = null;

                  if (result.type === 'success' && result.data?.totp) {
                    totpSetup = result.data.totp as typeof totpSetup;
                  }
                };
              }}
            >
              <Button
                label="Activer"
                type="submit"
                disabled={impersonating || submitting !== null}
              />
            </form>
          {/if}
        </div>

        {#if totpSetup && !account.security.totp}
          <form
            method="POST"
            action="?/totpVerify"
            class="flex flex-col gap-3 sm:flex-row"
            use:enhance={() => {
              submitting = 'totp';
              return async ({ result, update }) => {
                await update({ reset: result.type === 'success' });
                submitting = null;

                if (result.type === 'success') totpSetup = null;
              };
            }}
          >
            <img
              src={totpSetup.qr}
              alt="QR code à scanner avec l'application d'authentification"
              class="size-40 shrink-0 rounded-xl bg-white p-1"
            >
            <div class="flex flex-col gap-3 text-sm">
              <p>
                Scanne ce QR code avec l'application, ou saisis-y cette clé :
                <code class="block font-mono font-bold break-all select-all">
                  {totpSetup.secret}
                </code>
              </p>
              <label class="flex flex-col gap-1 font-bold">
                Code affiché par l'application
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
              <div class="flex gap-2">
                <Button
                  label="Annuler"
                  inline
                  onclick={() => (totpSetup = null)}
                />
                <Button
                  label={submitting === 'totp' ? 'Envoi…' : 'Confirmer'}
                  type="submit"
                  disabled={submitting !== null}
                />
              </div>
            </div>
          </form>
        {/if}

        {#if errorOf('totp')}
          <p class="text-sm font-bold text-error" role="alert">
            {errorOf('totp')}
          </p>
        {:else if savedOf('totp')}
          <p class="text-sm font-bold text-success" role="status">
            Application d'authentification activée.
          </p>
        {:else if removedOf('totp')}
          <p class="text-sm font-bold text-success" role="status">
            Application d'authentification désactivée.
          </p>
        {/if}
      </div>

      {@render keyBox({
        kind: 'key',
        section: 'keys',
        title: 'Clés de sécurité',
        text: "Demandée après le mot de passe : clé USB ou NFC (YubiKey…), ou le lecteur d'empreinte de l'appareil.",
        keys: account.security.keys,
        added: 'Clé de sécurité ajoutée.',
        removed: 'Clé de sécurité retirée.',
      })}

      {@render keyBox({
        kind: 'passkey',
        section: 'passkeys',
        title: "Clés d'accès (connexion sans mot de passe)",
        text: "Remplace le mot de passe et le second facteur : la clé te demande son code PIN ou ton empreinte. Sur l'écran de connexion, saisis ton pseudo puis choisis « avec une clé d'accès ».",
        keys: account.passkeys,
        added: "Clé d'accès ajoutée.",
        removed: "Clé d'accès retirée.",
      })}

      <!-- Envoyé par `registerKey` une fois que la clé a répondu. -->
      <form
        id="key-verify-form"
        method="POST"
        action="?/keyVerify"
        hidden
        use:enhance={() =>
          async ({ result, update }) => {
            await update({ reset: false });
            pendingKey = null;
            if (result.type === 'success') keyName = '';
          }}
      >
        <input type="hidden" name="kind" value={keyKind}>
        <input type="hidden" name="id" value={pendingKey?.id ?? ''}>
        <input type="hidden" name="name" value={keyName}>
        <input
          type="hidden"
          name="credential"
          value={pendingKey?.credential ?? ''}
        >
      </form>
    </section>
  {/if}

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

<Modal
  bind:open={keyModalOpen}
  size="small"
  title={keyKind === 'passkey'
    ? "Ajouter une clé d'accès"
    : 'Ajouter une clé de sécurité'}
  description="Donne-lui un nom pour la reconnaître, puis suis les instructions du navigateur."
>
  <form
    id="key-start-form"
    method="POST"
    action="?/keyStart"
    use:enhance={() => {
      keyModalOpen = false;
      submitting = keySection;
      keyError = null;

      return async ({ result, update }) => {
        await update({ reset: false });

        if (result.type === 'success' && result.data?.key) {
          await registerKey(
            result.data.key as Parameters<typeof registerKey>[0],
          );
        }
        submitting = null;
      };
    }}
  >
    <input type="hidden" name="kind" value={keyKind}>
    <label class="flex flex-col gap-1 p-1 text-sm font-bold">
      Nom de la clé
      <!-- Champ libre : ces attributs demandent aux gestionnaires de mots de passe de ne pas y
           proposer le code de double authentification. -->
      <input
        class={fieldStyle}
        type="text"
        maxlength="64"
        placeholder="Ex : YubiKey du bureau"
        autocomplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-bwignore
        data-form-type="other"
        data-protonpass-ignore="true"
        bind:value={keyName}
      >
    </label>
  </form>

  {#snippet footer()}
    <Button label="Annuler" inline onclick={() => (keyModalOpen = false)} />
    <Button label="Continuer" onclick={() => submitForm('key-start-form')} />
  {/snippet}
</Modal>

{#snippet keyBox(box: {
  kind: 'key' | 'passkey';
  section: 'keys' | 'passkeys';
  title: string;
  text: string;
  keys: { id: string; name: string }[];
  added: string;
  removed: string;
})}
  <div class="flex flex-col gap-3 rounded-xl bg-base-200 p-4">
    <div class="text-sm">
      <h3 class="font-bold">{box.title}</h3>
      <p class="opacity-70">{box.text}</p>
    </div>

    {#if box.keys.length > 0}
      <ul class="flex flex-col gap-2" aria-label={box.title}>
        {#each box.keys as key (key.id)}
          <li
            class="flex items-center justify-between gap-2 rounded-xl bg-base-100 px-4 py-2 text-sm"
          >
            <span class="truncate font-bold">{key.name}</span>
            <form
              method="POST"
              action="?/keyRemove"
              use:enhance={({ cancel }) => {
                if (!confirm(`Retirer la clé « ${key.name} » ?`)) {
                  cancel();
                  return;
                }

                submitting = box.section;
                return async ({ update }) => {
                  await update({ reset: false });
                  submitting = null;
                };
              }}
            >
              <input type="hidden" name="kind" value={box.kind}>
              <input type="hidden" name="id" value={key.id}>
              <Button
                label="Retirer"
                type="submit"
                size="tiny"
                inline
                disabled={impersonating || submitting !== null}
              />
            </form>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="flex justify-end">
      <Button
        label={submitting === box.section
          ? 'En attente de la clé…'
          : 'Ajouter une clé'}
        disabled={impersonating || submitting !== null}
        onclick={() => {
          keyName = '';
          keyKind = box.kind;
          keyModalOpen = true;
        }}
      />
    </div>

    {#if (keyError && keyKind === box.kind) || errorOf(box.section)}
      <p class="text-sm font-bold text-error" role="alert">
        {(keyKind === box.kind ? keyError : null) ?? errorOf(box.section)}
      </p>
    {:else if savedOf(box.section)}
      <p class="text-sm font-bold text-success" role="status">{box.added}</p>
    {:else if removedOf(box.section)}
      <p class="text-sm font-bold text-success" role="status">{box.removed}</p>
    {/if}
  </div>
{/snippet}
