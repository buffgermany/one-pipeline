<script lang="ts">
  import { page } from '$app/stores';
  import Search from 'lucide-svelte/icons/search';
  import Phone from 'lucide-svelte/icons/phone';
  import ChevronRight from 'lucide-svelte/icons/chevron-right';
  import PanelLeftOpen from 'lucide-svelte/icons/panel-left-open';
  import PanelLeftClose from 'lucide-svelte/icons/panel-left-close';

  interface Props {
    sidebarCollapsed: boolean;
    onToggleSidebar: () => void;
  }

  let { sidebarCollapsed, onToggleSidebar }: Props = $props();

  const pageNames: Record<string, string> = {
    '/': 'Übersicht',
    '/call': 'Anruf-Cockpit',
    '/queue': 'Firmen-Verzeichnis',
    '/import': 'Lead-Import'
  };

  let currentPageTitle = $derived(pageNames[$page.url.pathname] || 'Dashboard');
</script>

<header class="h-13 border-b border-[var(--color-border-subtle)] bg-[var(--color-page-void)] px-4 flex items-center justify-between shrink-0 select-none relative z-30">
  <!-- Left Section: Collapse Toggle & Breadcrumbs -->
  <div class="flex items-center gap-3">
    <button 
      onclick={onToggleSidebar}
      class="p-1.5 rounded-[var(--radius-md)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-panel)] transition-colors"
      title="Menü umschalten (⌘\)"
    >
      {#if sidebarCollapsed}
        <PanelLeftOpen size={17} />
      {:else}
        <PanelLeftClose size={17} />
      {/if}
    </button>

    <div class="h-4 w-px bg-[var(--color-border-subtle)]"></div>

    <div class="flex items-center gap-1.5 text-[13px] font-[var(--font-general-sans)]">
      <span class="text-[var(--color-ink-secondary)] font-medium">Buff Pipeline</span>
      <ChevronRight size={13} class="text-[var(--color-ink-muted)]" />
      <span class="text-[var(--color-ink-primary)] font-semibold font-[var(--font-excon)]">{currentPageTitle}</span>
    </div>
  </div>

  <!-- Center Section: Live Co-Pilot Status -->
  <div class="hidden md:flex items-center gap-2 px-3 py-1 rounded-[var(--radius-full)] bg-[var(--color-emerald-tint)] border border-[var(--color-emerald-border)]">
    <div class="relative flex h-2 w-2">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent-emerald)] opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent-emerald)]"></span>
    </div>
    <span class="text-[var(--color-accent-emerald)] text-[11px] font-[var(--font-excon)] font-bold tracking-wider uppercase">Live Co-Pilot aktiv</span>
  </div>

  <!-- Right Section: Quick Search & Dial CTA -->
  <div class="flex items-center gap-3">
    <!-- Quick Search Command Button -->
    <button 
      onclick={() => {
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
        window.dispatchEvent(event);
      }}
      class="flex items-center gap-2 bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] rounded-[var(--radius-md)] px-3 py-1.5 text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] transition-all group shadow-sm"
    >
      <Search size={14} class="text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink-secondary)] transition-colors" />
      <span class="hidden sm:inline font-[var(--font-general-sans)]">Leads & Einwände suchen...</span>
      <span class="sm:hidden font-[var(--font-general-sans)]">Suchen...</span>
      <kbd class="border border-[var(--color-border-subtle)] rounded bg-[var(--color-surface-lift)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-muted)] font-[var(--font-mono)] font-semibold ml-1">⌘K</kbd>
    </button>

    <!-- Quick Start Call CTA -->
    <a 
      href="/call"
      class="flex items-center gap-2 bg-[var(--color-accent-emerald)] hover:bg-[#0EA5E9] text-[#052E16] hover:text-white px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-[var(--font-excon)] font-bold transition-all active:translate-y-[1px] shadow-sm"
    >
      <Phone size={14} strokeWidth={2.5} />
      <span class="hidden sm:inline">Anrufe starten</span>
    </a>
  </div>
</header>
