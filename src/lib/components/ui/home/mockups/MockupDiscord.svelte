<script lang="ts">
import { Hash, Volume2 } from '@lucide/svelte';
import { cn } from '$lib/utils/cn';
import MockupShell from './MockupShell.svelte';

const channels = [
  { name: 'discussion', active: true, icon: Hash },
  { name: 'mises-a-jour', active: false, icon: Hash },
  { name: 'traducteurs', active: false, icon: Hash },
  { name: 'Canal vocal 1', active: false, icon: Volume2 },
] as const;

const messages = [
  { color: 'bg-primary/35', pSize: 'w-[78%]', sSize: 'w-[49%]' },
  { color: 'bg-secondary/30', pSize: 'w-[64%]', sSize: 'w-[42%]' },
  { color: 'bg-accent/25', pSize: 'w-[72%]', sSize: 'w-[46%]' },
  { color: 'bg-info/25', pSize: 'w-[58%]', sSize: 'w-[39%]' },
] as const;
</script>

<MockupShell badge="Serveur Discord">
  <div
    class="grid overflow-hidden gap-2 h-full min-h-0 rounded-lg border grid-cols-[6rem_1fr] border-base-content/12"
  >
    <div class="flex flex-col gap-1 p-0.5 bg-base-200/70">
      {#each channels as channel (channel.name)}
        <div
          class={cn(
  'flex gap-1 items-center px-1.5 py-1 font-medium rounded-md text-[0.62rem] hover:bg-base-300 hover:text-base-content text-base-content/80',
  channel.active && 'bg-primary/18 hover:bg-primary/25',
)}
        >
          <channel.icon class="size-3" aria-hidden="true" />
          <span class="truncate select-none">{channel.name}</span>
        </div>
      {/each}
    </div>
    <div class="flex flex-col gap-3 p-2.5">
      {#each messages as message, index (index)}
        <div class="flex flex-col gap-1">
          <div class="flex gap-1 items-center">
            <div class="size-5 rounded-full {message.color}"></div>
            <div class="w-16 h-2 rounded-sm bg-base-content/20"></div>
          </div>
          <div
            class={cn('h-2.5 rounded-sm bg-base-content/14', message.pSize)}
          ></div>
          <div
            class={cn('h-2.5 rounded-sm bg-base-content/14', message.sSize)}
          ></div>
        </div>
      {/each}
    </div>
  </div>
</MockupShell>
