<script lang="ts">
import RoleBadge from '#lib/components/ui/RoleBadge.svelte';
import { roleNameClass } from '#lib/role-style.ts';
import { cn } from '#lib/utils/cn.ts';

interface Props {
  title: string;
  classes?: string;
  //? Membres de l'équipe, du rôle le plus fort au plus faible (voir `listStaff`).
  staff: {
    name: string;
    slug: string;
    avatar: string | null;
    roleLabel: string;
    roleStyle: string;
  }[];
}

const { title, classes, staff }: Props = $props();
</script>

{#if staff.length > 0}
  <section class={cn('flex flex-col gap-4', classes)}>
    <h3 class="text-xl font-bold">{title}</h3>
    <div
      class="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
    >
      {#each staff as member (member.slug)}
        <a href="/profile/{member.slug}">
          <article
            class="flex h-full flex-col items-center gap-3 rounded-xl bg-base-300 p-4 text-center shadow transition-all hover:-rotate-1 hover:shadow-md"
          >
            {#if member.avatar}
              <img
                src={member.avatar}
                alt=""
                loading="lazy"
                draggable="false"
                class="size-20 rounded-full bg-base-200 object-cover"
              >
            {:else}
              <!-- Sans image : l'initiale du pseudo. -->
              <div
                class="flex size-20 items-center justify-center rounded-full bg-base-200 text-2xl font-bold text-base-content/40"
                aria-hidden="true"
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            {/if}
            <div class="flex w-full min-w-0 flex-col items-center gap-1">
              <h4
                class={cn(
                  'max-w-full truncate font-bold',
                  roleNameClass(member.roleStyle),
                )}
              >
                {member.name}
              </h4>
              <RoleBadge label={member.roleLabel} style={member.roleStyle} />
            </div>
          </article>
        </a>
      {/each}
    </div>
  </section>
{/if}
