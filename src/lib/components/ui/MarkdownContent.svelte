<script lang="ts">
import type { Inline, ListItem, MarkdownBlock } from '$lib/markdown/content';

interface Props {
  document: MarkdownBlock[];
  class?: string;
}

const { document, class: className = '' }: Props = $props();
</script>

{#snippet inlines(
  nodes: Inline[],
)}
  {#each nodes as node, i (i)}
    {#if node.kind === 'text'}
      {node.text}
    {:else if node.kind === 'strong'}
      <strong class="font-bold">{@render inlines(node.children)}</strong>
    {:else if node.kind === 'em'}
      <em>{@render inlines(node.children)}</em>
    {:else if node.kind === 'link'}
      <a
        class="text-primary underline underline-offset-2 hover:opacity-80"
        href={node.href}
        rel="noopener noreferrer nofollow"
        target="_blank"
      >
        {@render inlines(node.children)}
      </a>
    {:else if node.kind === 'code'}
      <code class="rounded bg-base-100 px-1 py-0.5 text-sm">{node.text}</code>
    {:else if node.kind === 'br'}
      <br>
    {/if}
  {/each}
{/snippet}

{#snippet listItems(
  items: ListItem[],
  ordered: boolean,
)}
  {#if ordered}
    <ol class="mb-3 list-decimal pl-5">
      {#each items as item, i (i)}
        <li class="my-1">{@render renderBlocks(item.blocks)}</li>
      {/each}
    </ol>
  {:else}
    <ul class="mb-3 list-disc pl-5">
      {#each items as item, i (i)}
        <li class="my-1">{@render renderBlocks(item.blocks)}</li>
      {/each}
    </ul>
  {/if}
{/snippet}

{#snippet renderBlocks(
  nodes: MarkdownBlock[],
)}
  {#each nodes as block, i (i)}
    {#if block.kind === 'heading'}
      {#if block.level === 1}
        <h1 class="mb-2 text-2xl leading-tight font-bold">
          {@render inlines(block.inlines)}
        </h1>
      {:else if block.level === 2}
        <h2 class="mt-4 mb-2 text-xl leading-tight font-bold">
          {@render inlines(block.inlines)}
        </h2>
      {:else if block.level === 3}
        <h3 class="mt-4 mb-2 text-lg leading-tight font-bold">
          {@render inlines(block.inlines)}
        </h3>
      {:else}
        <h4 class="mt-4 mb-2 font-bold">{@render inlines(block.inlines)}</h4>
      {/if}
    {:else if block.kind === 'paragraph'}
      <p class="mb-3 leading-relaxed">{@render inlines(block.inlines)}</p>
    {:else if block.kind === 'list'}
      {@render listItems(block.items, block.ordered)}
    {:else if block.kind === 'hr'}
      <hr class="my-4 border-base-content/20">
    {:else if block.kind === 'blockquote'}
      <blockquote class="my-3 border-l-[3px] border-primary pl-3 opacity-80">
        {@render renderBlocks(block.blocks)}
      </blockquote>
    {:else if block.kind === 'table'}
      <div class="mb-3 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr>
              {#each block.headers as header, j (j)}
                <th class="border border-base-content/20 px-3 py-1 text-left">
                  {@render inlines(header)}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each block.rows as row, j (j)}
              <tr>
                {#each row as cell, k (k)}
                  <td class="border border-base-content/20 px-3 py-1">
                    {@render inlines(cell)}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/each}
{/snippet}

<div class="wrap-break-words {className}">
  {@render renderBlocks(document)}
</div>
