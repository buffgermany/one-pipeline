<script lang="ts">
  import type { Snippet } from 'svelte';
  
  let { children, class: className = '', onclick, type = 'button', disabled = false, variant = 'primary' } : { 
    children: Snippet, 
    class?: string, 
    onclick?: () => void,
    type?: 'button' | 'submit' | 'reset',
    disabled?: boolean,
    variant?: 'primary' | 'secondary' | 'ghost'
  } = $props();

  let baseClasses = "rounded-[var(--radius-buttons)] text-[var(--text-body-sm)] tracking-[var(--tracking-body-sm)] px-[var(--spacing-24)] py-[var(--spacing-12)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-spray-wash)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-slate-matte)] font-medium flex items-center justify-center gap-2";
  
  let variantClasses = $derived(
    disabled 
      ? "bg-[var(--color-ash-step)] text-[var(--color-sand-label)] cursor-not-allowed opacity-60 shadow-none border border-transparent"
      : variant === 'primary' 
        ? "bg-[var(--color-spray-wash)] text-[#09090b] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:-translate-y-[1px] active:translate-y-[1px] border border-transparent shadow-[0_4px_10px_rgba(0,0,0,0.2)] font-bold"
        : variant === 'secondary'
          ? "bg-[var(--color-graphite-card)] text-[var(--color-off-white-ink)] border-[var(--border-premium)] hover:bg-[var(--color-ash-step)] shadow-sm hover:shadow-md hover:-translate-y-[1px] active:translate-y-[1px]"
          : "bg-transparent text-[var(--color-sand-label)] hover:text-[var(--color-off-white-ink)] hover:bg-[var(--color-ash-step)]/50"
  );
</script>

<button
  {type}
  {disabled}
  class="{baseClasses} {variantClasses} {className}"
  {onclick}
>
  {@render children()}
</button>
