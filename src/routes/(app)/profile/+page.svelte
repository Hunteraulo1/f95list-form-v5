<script lang="ts">
import { tick } from 'svelte';
import ProfileView, {
  type ProfileField,
} from '#lib/components/profile/ProfileView.svelte';
import Button from '#lib/components/ui/Button.svelte';
import MarkdownEditor from '#lib/components/ui/MarkdownEditor.svelte';
import Modal from '#lib/components/ui/Modal.svelte';
import { IMAGE_HOSTS } from '#lib/image-hosts.ts';
import { DESCRIPTION_MAX_LENGTH } from '#lib/profile.ts';
import { submitForm } from '#lib/utils/form.ts';
import { enhance } from '$app/forms';
import { page } from '$app/state';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

type ImageField = Exclude<ProfileField, 'description'>;

const user = $derived(data.profile);
const impersonating = $derived(Boolean(page.data.impersonator));

let editMode = $state(false);
//? Avatar et bannière s'éditent dans une fenêtre ; la description directement dans son bloc.
let imageField = $state<ImageField | null>(null);
let editingDescription = $state(false);
let draft = $state('');
let description = $state('');

const fieldStyle =
  'shadow-mini w-full rounded-xl border-2 border-transparent bg-neutral-content px-4 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary';

const hosts = IMAGE_HOSTS.map((host) => new URL(host).hostname).join(', ');

const titles: Record<ImageField, string> = {
  avatar: "Changer l'image",
  banner: 'Changer la bannière',
  background: "Changer l'image de fond",
  music: 'Changer la musique',
  cursor: 'Changer le curseur',
};
const isMusic = $derived(imageField === 'music');

const edit = (target: ProfileField) => {
  if (target === 'description') {
    description = user.description ?? '';
    editingDescription = true;
    return;
  }

  draft = user[target] ?? '';
  imageField = target;
};

//? Vider le champ puis enregistrer : retire l'image.
const clear = async () => {
  draft = '';
  await tick();
  submitForm('profile-form');
};

//? Quitter le mode édition abandonne aussi une description en cours.
const toggleEditMode = () => {
  editMode = !editMode;
  if (!editMode) editingDescription = false;
};

const imageError = $derived(
  form && 'message' in form && form.field === imageField ? form.message : null,
);
const descriptionError = $derived(
  form && 'message' in form && form.field === 'description'
    ? form.message
    : null,
);
</script>

<div
  class="absolute top-16 left-0 flex w-full items-center justify-center gap-2 bg-base-300 p-1"
>
  {#if impersonating}
    La modification du profil est désactivée en naviguant en tant qu'un autre
    compte.
  {:else}
    {#if editMode}
      Si vous souhaitez arrêter le mode édition de profil, c'est juste ici.
    {:else}
      Si vous souhaitez modifier votre profil, vous devez passer en mode édition
      de profil.
    {/if}
    <Button
      label={editMode ? 'Arrêter le mode édition' : 'Activer le mode édition'}
      size="tiny"
      onclick={toggleEditMode}
    />
  {/if}
</div>

<ProfileView
  profile={{
    name: user.name,
    roleLabel: user.role.label,
    roleStyle: user.role.badgeStyle,
    avatar: user.avatar,
    banner: user.banner,
    description: user.description,
    ...data.customization,
  }}
  descriptionDocument={data.descriptionDocument}
  translations={data.translations}
  query={data.query}
  basePath="/profile"
  publicPath="/profile/{user.slug}"
  editMode={editMode && !impersonating}
  customize={data.customize}
  onedit={edit}
  {editingDescription}
>
  {#snippet descriptionEditor()}
    <form
      method="POST"
      action="?/description"
      class="flex flex-col gap-3"
      use:enhance={() =>
        async ({ result, update }) => {
          await update({ reset: false });
          if (result.type === 'success') editingDescription = false;
        }}
    >
      <MarkdownEditor
        bind:value={description}
        name="description"
        maxLength={DESCRIPTION_MAX_LENGTH}
        placeholder="Présentez-vous, vos spécialités, vos projets…"
      />

      {#if descriptionError}
        <p class="text-sm font-bold text-error" role="alert">
          {descriptionError}
        </p>
      {/if}

      <div class="flex justify-end gap-2">
        <Button
          label="Annuler"
          inline
          onclick={() => (editingDescription = false)}
        />
        <Button label="Enregistrer" type="submit" />
      </div>
    </form>
  {/snippet}
</ProfileView>

<Modal
  open={imageField !== null}
  onclose={() => (imageField = null)}
  title={imageField ? titles[imageField] : ''}
  description={isMusic
    ? "Lien d'une vidéo YouTube ou YouTube Music. Les visiteurs la lancent eux-mêmes : rien ne démarre tout seul."
    : `Lien d'une image hébergée sur : ${hosts}.${imageField === 'background' ? ' Taille conseillée : 1500×900 px.' : imageField === 'cursor' ? ' Image carrée à fond transparent, affichée en 32×32 px à la place de la souris sur votre profil.' : ''}`}
>
  {#if imageField}
    <form
      id="profile-form"
      method="POST"
      action="?/{imageField}"
      class="flex flex-col gap-4"
      use:enhance={() =>
        async ({ result, update }) => {
          await update({ reset: false });
          if (result.type === 'success') imageField = null;
        }}
    >
      <label class="flex flex-col gap-1 text-sm font-bold">
        {isMusic ? 'Lien de la musique' : "Adresse de l'image"}
        <input
          class="{fieldStyle} h-9"
          type="url"
          name={imageField}
          maxlength="2048"
          placeholder={isMusic
            ? 'https://music.youtube.com/watch?v=…'
            : 'https://cdn.discordapp.com/…'}
          bind:value={draft}
        >
      </label>

      {#if imageError}
        <p class="text-sm font-bold text-error" role="alert">{imageError}</p>
      {/if}

      <div class="flex justify-end gap-2">
        {#if user[imageField]}
          <Button
            label={isMusic ? 'Retirer la musique' : "Retirer l'image"}
            inline
            onclick={clear}
          />
        {/if}
        <Button label="Annuler" inline onclick={() => (imageField = null)} />
        <Button label="Enregistrer" type="submit" />
      </div>
    </form>
  {/if}
</Modal>
