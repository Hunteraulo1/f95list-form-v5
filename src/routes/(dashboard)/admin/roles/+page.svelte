<script lang="ts">
import { enhance } from '$app/forms';
import Button from '$lib/components/ui/Button.svelte';
import Modal from '$lib/components/ui/Modal.svelte';
import {
  applyDependenciesToChecks,
  getDependentPermissions,
  getPermissionParent,
  PERMISSIONS,
  type Permission,
} from '$lib/permissions';
import { cn } from '$lib/utils/cn';
import type { ActionData, PageData } from './$types';

interface Props {
  data: PageData;
  form: ActionData;
}

const { data, form }: Props = $props();

const fieldStyle =
  'shadow-mini rounded-xl border-2 border-transparent bg-neutral-content px-3 text-sm font-bold text-primary outline-none hover:border-primary focus:border-primary read-only:opacity-60 read-only:hover:border-transparent disabled:opacity-60';
const cardStyle = 'flex flex-col gap-4 rounded-xl bg-base-100 p-4';

const role = $derived(data.selected);
//? Sur le rôle super admin, seuls les quotas se règlent, et seulement par un super admin.
const quotasEditable = $derived(
  role.canManage || (role.isSuper && data.canEditPriority),
);
const permissionsLocked = $derived(role.isSuper || !role.canManage);

let createOpen = $state(false);
let checks = $state<Record<string, boolean>>({});

//? Les cases suivent le rôle affiché, y compris après un enregistrement.
$effect(() => {
  checks = Object.fromEntries(
    data.groups.flatMap(({ items }) =>
      items.map(({ key }) => [key, role.permissions.includes(key)]),
    ),
  );
});

const parentBlocked = (key: string) => {
  const parent = getPermissionParent(key);
  return parent !== undefined && !checks[parent];
};

//? Une case est bloquée tant que sa permission parente n'est pas cochée (sauf rôle super admin).
const isBlocked = (key: string) => !role.isSuper && parentBlocked(key);
const isDisabled = (key: string) => permissionsLocked || isBlocked(key);

const setChecked = (key: string, checked: boolean) => {
  const next = { ...checks, [key]: checked };
  if (!checked) {
    for (const dependent of getDependentPermissions(key))
      next[dependent] = false;
  }
  checks = applyDependenciesToChecks(next);
};

const message = $derived(form && 'message' in form ? form.message : null);

const plural = (count: number, word: string) =>
  `${count} ${word}${count > 1 ? 's' : ''}`;
</script>

<div class="flex flex-col gap-4 p-2">
  <div class="flex items-center justify-between gap-4 pt-2">
    <h3 class="text-xl font-bold">Rôles et permissions</h3>
    <Button label="Nouveau rôle" onclick={() => (createOpen = true)} />
  </div>

  {#if message}
    <p
      class="rounded-xl bg-error/20 p-3 text-sm font-bold text-error"
      role="alert"
    >
      {message}
    </p>
  {:else if data.notice}
    <p
      class="rounded-xl bg-success/20 p-3 text-sm font-bold text-success"
      role="status"
    >
      {data.notice}
    </p>
  {/if}

  <div class="grid gap-4 lg:grid-cols-[18rem_1fr]">
    <ul class="{cardStyle} h-fit gap-1 p-2">
      {#each data.roles as item (item.id)}
        <li>
          <a
            href="/admin/roles?role={encodeURIComponent(item.name)}"
            class={cn(
  'flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-base-200',
  item.id === role.id && 'bg-base-300',
)}
          >
            <span class="flex min-w-0 flex-col">
              <span class="truncate font-bold">{item.label}</span>
              <span class="text-xs opacity-60">
                {#if data.canEditPriority}
                  Force {item.priority} ·
                {/if}
                {plural(item.permissions.length, 'droit')}
              </span>
            </span>
            <span
              class="shrink-0 rounded-lg bg-base-300 px-2 py-0.5 text-xs font-bold"
              title={plural(item.users, 'utilisateur')}
            >
              {item.users}
            </span>
          </a>
        </li>
      {/each}
    </ul>

    <div class="flex min-w-0 flex-col gap-4">
      {#if role.isSuper}
        <p class="rounded-xl bg-info/20 p-3 text-sm">
          Le rôle super admin possède automatiquement tous les droits. Seuls ses
          quotas API peuvent être ajustés ici, par un super admin.
        </p>
      {:else if !role.canManage && role.blockedReason}
        <p class="rounded-xl bg-warning/20 p-3 text-sm">{role.blockedReason}</p>
      {/if}

      <section class={cardStyle}>
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-col gap-1">
            <h4 class="text-lg font-bold">{role.label}</h4>
            <p class="font-mono text-sm opacity-70">{role.name}</p>
            <div class="flex gap-1">
              {#if role.isSystem}
                <span
                  class="rounded-lg bg-info/20 px-2 py-0.5 text-xs font-bold"
                >
                  Rôle système
                </span>
              {/if}
              <span
                class="rounded-lg bg-base-300 px-2 py-0.5 text-xs font-bold"
              >
                {plural(role.users, 'utilisateur')}
              </span>
            </div>
          </div>

          {#if !role.isSystem && role.canManage}
            <form
              method="POST"
              action="?/deleteRole"
              use:enhance={({ cancel }) => {
  if (
    !confirm(
      `Supprimer le rôle « ${role.label} » ? Cette action est définitive.`,
    )
  )
    cancel();
}}
            >
              <input type="hidden" name="id" value={role.id}>
              <Button
                label="Supprimer"
                type="submit"
                size="small"
                classes={cn(
  'hover:bg-red-400 hover:text-white',
  role.users > 0 && 'pointer-events-none opacity-50',
)}
              />
            </form>
          {/if}
        </div>

        <form
          method="POST"
          action="?/updateRole"
          class="flex flex-col gap-3"
          use:enhance
        >
          <input type="hidden" name="id" value={role.id}>

          <label class="flex flex-col gap-1 text-sm font-bold">
            Libellé
            <input
              class="{fieldStyle} h-9"
              name="label"
              maxlength="64"
              value={role.label}
              readonly={role.isSystem || !role.canManage}
            >
          </label>
          <label class="flex flex-col gap-1 text-sm font-bold">
            Description
            <textarea
              class="{fieldStyle} min-h-16 resize-y py-2"
              name="description"
              maxlength="500"
              readonly={role.isSystem || !role.canManage}
            >{role.description}</textarea>
          </label>

          <fieldset class="flex flex-wrap gap-4" disabled={!quotasEditable}>
            <label class="flex flex-col gap-1 text-sm font-bold">
              Clés API max. par utilisateur
              <input
                class="{fieldStyle} h-9 w-40"
                type="number"
                name="apiKeyLimit"
                min="0"
                max={data.limits.keys}
                value={role.apiKeyLimit}
              >
            </label>
            <label class="flex flex-col gap-1 text-sm font-bold">
              Requêtes API / jour / clé
              <input
                class="{fieldStyle} h-9 w-40"
                type="number"
                name="apiDailyQuota"
                min="0"
                max={data.limits.quota}
                value={role.apiDailyQuota}
              >
            </label>
            {#if data.canEditPriority}
              <label class="flex flex-col gap-1 text-sm font-bold">
                Force du rôle
                <input
                  class="{fieldStyle} h-9 w-32"
                  type="number"
                  name="priority"
                  min="0"
                  max={data.limits.priority}
                  value={role.priority}
                  disabled={role.isSuper}
                >
              </label>
            {/if}
          </fieldset>
          {#if data.canEditPriority}
            <p class="text-xs opacity-60">
              Un rôle ne peut gérer que les rôles de force strictement
              inférieure à la sienne. Plus la force est haute, plus le rôle est
              classé en premier.
            </p>
          {/if}

          {#if quotasEditable}
            <Button label="Enregistrer" type="submit" classes="self-start" />
          {/if}
        </form>
      </section>

      <form
        method="POST"
        action="?/updatePermissions"
        class={cardStyle}
        use:enhance
      >
        <input type="hidden" name="id" value={role.id}>
        <h4 class="text-lg font-bold">Permissions</h4>

        {#if !role.canManage && !role.isSuper}
          <ul class="flex flex-wrap gap-2">
            {#each role.permissions as key (key)}
              <li class="rounded-lg bg-base-300 px-2 py-1 text-xs font-bold">
                {PERMISSIONS[key].label}
              </li>
            {:else}
              <li class="text-sm opacity-60">Aucune permission.</li>
            {/each}
          </ul>
        {:else}
          {#each data.groups as { group, items } (group)}
            <fieldset class="flex flex-col gap-2">
              <legend class="pb-1 text-sm font-bold opacity-80">{group}</legend>
              <div class="grid gap-2 sm:grid-cols-2">
                {#each items as item (item.key)}
                  <label
                    class={cn(
  'flex items-start gap-2 rounded-lg border border-base-300 p-3',
  isDisabled(item.key) ? 'opacity-70' : 'cursor-pointer hover:bg-base-200',
)}
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={item.key}
                      class="mt-1"
                      checked={role.isSuper || (checks[item.key] ?? false)}
                      disabled={isDisabled(item.key)}
                      onchange={(e) => setChecked(item.key, e.currentTarget.checked)}
                    >
                    <span class="flex flex-col text-sm">
                      <span class="font-bold">{item.label}</span>
                      <span class="opacity-70">{item.description}</span>
                      {#if isBlocked(item.key) && item.requires}
                        <span class="text-xs text-warning">
                          Nécessite «
                          {PERMISSIONS[item.requires as Permission].label}
                          »
                        </span>
                      {/if}
                    </span>
                  </label>
                {/each}
              </div>
            </fieldset>
          {/each}

          {#if !permissionsLocked}
            <Button
              label="Enregistrer les permissions"
              type="submit"
              classes="self-start"
            />
          {/if}
        {/if}
      </form>
    </div>
  </div>
</div>

<Modal
  bind:open={createOpen}
  title="Nouveau rôle"
  description="Le rôle est créé sans permission et avec la force la plus basse."
>
  <form
    method="POST"
    action="?/createRole"
    class="flex flex-col gap-4"
    use:enhance={() =>
  async ({ update }) => {
    await update();
    createOpen = false;
  }}
  >
    <label class="flex flex-col gap-1 text-sm font-bold">
      Libellé
      <input class="{fieldStyle} h-9" name="label" maxlength="64" required>
    </label>
    <label class="flex flex-col gap-1 text-sm font-bold">
      Description (optionnelle)
      <textarea
        class="{fieldStyle} min-h-16 resize-y py-2"
        name="description"
        maxlength="500"
      ></textarea>
    </label>
    <div class="flex justify-end gap-2">
      <Button label="Annuler" inline onclick={() => (createOpen = false)} />
      <Button label="Créer" type="submit" />
    </div>
  </form>
</Modal>
