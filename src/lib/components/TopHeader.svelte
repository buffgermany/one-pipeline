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

<header class="h-13 border-b border-[var(--color-border-subtle)] bg-[#07080B]/90 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 select-none relative z-30">
  <!-- Left Section: Collapse Toggle & Breadcrumbs -->
  <div class="flex items-center gap-3">
    <button 
      onclick={onToggleSidebar}
      class="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-all cursor-pointer"
      title="Menü umschalten (⌘\)"
    >
      {#if sidebarCollapsed}
        <PanelLeftOpen size={17} />
      {:else}
        <PanelLeftClose size={17} />
      {/if}
    </button>

    <div class="h-4 w-px bg-neutral-800/80"></div>

    <div class="flex items-center gap-1.5 text-xs font-[var(--font-general-sans)]">
      <span class="text-neutral-400 font-medium">Buff Pipeline</span>
      <ChevronRight size={13} class="text-neutral-600" />
      <span class="text-white font-bold font-[var(--font-excon)] tracking-tight">{currentPageTitle}</span>
    </div>
  </div>

  <!-- Center Section: Live Co-Pilot Status -->
  <div class="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
    <div class="relative flex h-2 w-2">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
    </div>
    <span class="text-emerald-400 text-[11px] font-[var(--font-excon)] font-bold tracking-wider uppercase">Live Co-Pilot aktiv</span>
  </div>

  <!-- Right Section: Quick Search & Dial CTA -->
  <div class="flex items-center gap-3">
    <!-- Quick Search Command Button -->
    <button 
      onclick={() => {
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
        window.dispatchEvent(event);
      }}
      class="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/80 rounded-xl px-3 py-1.5 text-xs text-neutral-300 hover:text-white transition-all group shadow-sm cursor-pointer"
    >
      <Search size={14} class="text-neutral-500 group-hover:text-neutral-300 transition-colors" />
      <span class="hidden sm:inline font-[var(--font-general-sans)]">Leads & Einwände suchen...</span>
      <span class="sm:hidden font-[var(--font-general-sans)]">Suchen...</span>
      <kbd class="border border-neutral-800 rounded bg-neutral-950 px-1.5 py-0.5 text-[10px] text-neutral-400 font-[var(--font-mono)] font-semibold ml-1">⌘K</kbd>
    </button>

    <!-- Quick Start Call CTA -->
    <a 
      href="/call"
      class="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 px-3.5 py-1.5 rounded-xl text-xs font-[var(--font-excon)] font-bold transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
    >
      <Phone size={14} strokeWidth={2.5} />
      <span class="hidden sm:inline">Anrufe starten</span>
    </a>
  </div>
</header>
