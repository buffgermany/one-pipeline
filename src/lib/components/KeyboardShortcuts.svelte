<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  let showModal = $state(false);

  function handleKeydown(e: KeyboardEvent) {
    // Only trigger if we aren't typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === '?') {
      showModal = !showModal;
    } else if (e.key === 'Escape' && showModal) {
      showModal = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    in:fade={{ duration: 200 }}
    out:fade={{ duration: 150 }}
    onclick={() => showModal = false}
  >
    <div 
      class="bg-[var(--color-graphite-card)] border border-[var(--color-ash-step)] rounded-[var(--radius-cards)] p-6 shadow-2xl max-w-md w-full"
      in:scale={{ duration: 300, start: 0.95, opacity: 0 }}
      out:scale={{ duration: 200, start: 0.95, opacity: 0 }}
      onclick={(e) => e.stopPropagation()}
    >
      <h2 class="text-[var(--text-subheading)] tracking-[var(--tracking-subheading)] mb-6 text-[var(--color-off-white-ink)]">Keyboard Shortcuts</h2>
      
      <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center pb-4 border-b border-[var(--color-ash-step)]">
          <span class="text-[var(--text-body-sm)] text-[var(--color-sand-label)]">Pull Next Lead</span>
          <kbd class="bg-[var(--color-slate-matte)] border border-[var(--color-ash-step)] rounded px-2 py-1 text-[var(--text-caption)] font-mono text-[var(--color-off-white-ink)] shadow-[var(--shadow-inset-card)]">Space</kbd>
        </div>
        <div class="flex justify-between items-center pb-4 border-b border-[var(--color-ash-step)]">
          <span class="text-[var(--text-body-sm)] text-[var(--color-sand-label)]">Toggle Shortcuts</span>
          <kbd class="bg-[var(--color-slate-matte)] border border-[var(--color-ash-step)] rounded px-2 py-1 text-[var(--text-caption)] font-mono text-[var(--color-off-white-ink)] shadow-[var(--shadow-inset-card)]">?</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-[var(--text-body-sm)] text-[var(--color-sand-label)]">Close Modals</span>
          <kbd class="bg-[var(--color-slate-matte)] border border-[var(--color-ash-step)] rounded px-2 py-1 text-[var(--text-caption)] font-mono text-[var(--color-off-white-ink)] shadow-[var(--shadow-inset-card)]">Esc</kbd>
        </div>
      </div>
    </div>
  </div>
{/if}
