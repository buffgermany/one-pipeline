<script lang="ts">
  import { page } from '$app/stores';

  let { title, description } = $props<{ title: string; description?: string }>();

  // Simple breadcrumb generator based on path
  let pathSegments = $derived($page.url.pathname.split('/').filter(Boolean));
</script>

<div class="flex flex-col gap-2 mb-[var(--spacing-32)]">
  {#if pathSegments.length > 0}
    <div class="flex items-center gap-2 text-[var(--text-caption)] text-[var(--color-sand-label)] tracking-[var(--tracking-caption)] uppercase mb-2">
      <a href="/" class="hover:text-[var(--color-off-white-ink)] transition-colors">Pipeline</a>
      {#each pathSegments as segment, i}
        <span>/</span>
        <span class={i === pathSegments.length - 1 ? 'text-[var(--color-off-white-ink)] font-medium' : 'hover:text-[var(--color-off-white-ink)] transition-colors'}>
          {segment}
        </span>
      {/each}
    </div>
  {/if}
  <h1 class="text-[var(--text-display)] tracking-[var(--tracking-display)]">{title}</h1>
  {#if description}
    <p class="text-[var(--color-sand-label)] text-[var(--text-subheading)] tracking-[var(--tracking-subheading)] max-w-2xl">{description}</p>
  {/if}
</div>
