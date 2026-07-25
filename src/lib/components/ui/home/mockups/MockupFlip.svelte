<script lang="ts">
import { tick, untrack } from 'svelte';
import DiscordMockup from './MockupDiscord.svelte';
import MockupSheet from './MockupSheet.svelte';
import MockupWiki from './MockupWiki.svelte';
import {
  resetFlipperTransform,
  runProductCardFlipAnimation,
} from './mockup-animation';

type MockupKind = 'sheet' | 'discord' | 'wiki';

interface SlideMockup {
  mockup: MockupKind;
}

interface Props {
  activeSlide: number;
  slides: SlideMockup[];
}

let { activeSlide, slides }: Props = $props();

const slideCount = $derived(slides.length);

let shownIndex = $state(0);
let targetIndex = $state(0);
let backFaceVisible = $state(false);
let isSpinning = $state(false);
let pendingTarget = $state<number | null>(null);
let flipperEl: HTMLDivElement | null = null;

const faceBaseClass =
  'absolute inset-0 size-full [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform-style:preserve-3d]';

const getSpinDirection = (from: number, to: number): 1 | -1 => {
  if (from === to) return 1;
  const forward = (to - from + slideCount) % slideCount;
  const backward = (from - to + slideCount) % slideCount;
  return forward <= backward ? 1 : -1;
};

const flipTo = async (to: number) => {
  if (to === shownIndex || isSpinning) return;
  if (!flipperEl) return;

  isSpinning = true;
  targetIndex = to;
  backFaceVisible = false;

  const forward = getSpinDirection(shownIndex, to) === 1;

  resetFlipperTransform(flipperEl);
  await tick();

  try {
    await runProductCardFlipAnimation(flipperEl, {
      forward,
      onRevealBack: () => {
        backFaceVisible = true;
      },
    });

    shownIndex = to;
    backFaceVisible = false;
    resetFlipperTransform(flipperEl);
  } finally {
    isSpinning = false;

    if (pendingTarget !== null && pendingTarget !== shownIndex) {
      const next = pendingTarget;
      pendingTarget = null;
      await flipTo(next);
    } else {
      pendingTarget = null;
    }
  }
};

$effect(() => {
  const to = activeSlide;

  untrack(() => {
    if (isSpinning) {
      if (to !== shownIndex && to !== targetIndex) {
        pendingTarget = to;
      }
      return;
    }

    if (to !== shownIndex && flipperEl) {
      void flipTo(to);
    }
  });
});
</script>

{#snippet mockupFace(slide: SlideMockup)}
	<div class="relative flex h-full w-full items-stretch justify-center">
		<div
			class="pointer-events-none absolute inset-[12%_-6%_-12%] rounded-2xl bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklab,var(--color-primary)_42%,transparent),transparent_70%)] opacity-50 blur-[20px]"
		></div>
		<div class="relative z-1 flex h-full w-full max-w-2xl antialiased">
			{#if slide.mockup === "sheet"}
				<MockupSheet />
			{:else if slide.mockup === "discord"}
				<DiscordMockup />
			{:else}
				<MockupWiki />
			{/if}
		</div>
	</div>
{/snippet}

<div
	class="relative h-92 md:h-full w-full perspective-origin-[50%_50%] perspective-midrange"
>
	<div
		class="h-full w-full origin-[50%_50%] animate-float-sheet transform-3d"
		class:paused={isSpinning}
	>
		<div
			bind:this={flipperEl}
			class="relative h-full w-full origin-[50%_50%] transform-[rotateY(0deg)] will-change-transform transform-3d"
		>
			<div
				class="{faceBaseClass} transform-[rotateY(0deg)_translateZ(1px)]"
				class:opacity-0={backFaceVisible}
			>
				{@render mockupFace(slides[shownIndex])}
			</div>
			<div
				class="{faceBaseClass} pointer-events-none transform-[rotateY(180deg)_translateZ(1px)] opacity-0"
				class:opacity-100={backFaceVisible}
				class:pointer-events-auto={backFaceVisible}
			>
				{@render mockupFace(slides[targetIndex])}
			</div>
		</div>
	</div>
</div>
