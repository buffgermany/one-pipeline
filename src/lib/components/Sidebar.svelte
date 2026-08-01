<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import LayoutDashboard from 'lucide-svelte/icons/layout-dashboard';
  import PhoneCall from 'lucide-svelte/icons/phone-call';
  import UploadCloud from 'lucide-svelte/icons/upload-cloud';
  import ListFilter from 'lucide-svelte/icons/list-filter';
  import Clock from 'lucide-svelte/icons/clock';
  import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
  import PanelLeftClose from 'lucide-svelte/icons/panel-left-close';
  import PanelLeftOpen from 'lucide-svelte/icons/panel-left-open';
  import Box from 'lucide-svelte/icons/box';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';
  import Building2 from 'lucide-svelte/icons/building-2';
  import LogOut from 'lucide-svelte/icons/log-out';

  interface Props {
    collapsed?: boolean;
    onToggle?: () => void;
  }

  let { collapsed = $bindable(false), onToggle }: Props = $props();

  let currentUser = $derived($page.data.user || {
    id: 'agent-felix',
    name: 'Felix',
    email: 'felix@buff.de',
    avatar: 'FX',
    role: 'Sales Lead'
  });

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/login';
    }
  }

  function toggleSidebar() {
    collapsed = !collapsed;
    if (typeof window !== 'undefined') {
      localStorage.setItem('buff_sidebar_collapsed', String(collapsed));
    }
    if (onToggle) onToggle();
  }

  onMount(() => {
    const stored = localStorage.getItem('buff_sidebar_collapsed');
    if (stored !== null) {
      collapsed = stored === 'true';
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const mainLinks = [
    { href: '/', label: 'Übersicht', icon: LayoutDashboard, shortcut: 'G O' },
    { href: '/call', label: 'Anruf-Cockpit', icon: PhoneCall, shortcut: 'G C' },
    { href: '/queue', label: 'Firmen-Verzeichnis', icon: Building2, shortcut: 'G B' },
    { href: '/import', label: 'Lead-Import', icon: UploadCloud, shortcut: 'G I' }
  ];

  const queueFilters = [
    { href: '/queue?status=new', label: 'Alle Unternehmen', icon: ListFilter, count: 24, status: 'emerald' },
    { href: '/queue?status=rescheduled', label: 'Wiedervorlagen', icon: Clock, count: 5, status: 'amber' },
    { href: '/queue?status=completed', label: 'Erfolge & Termine', icon: CheckCircle2, count: 12, status: 'emerald' }
  ];
</script>

<aside 
  class="h-full bg-[var(--color-surface-panel)] border-r border-[var(--color-border-subtle)] flex flex-col transition-all duration-200 ease-in-out select-none z-40 relative shrink-0"
  class:w-56={!collapsed}
  class:w-[56px]={collapsed}
>
  <!-- Workspace Header -->
  <div class="h-13 px-3 flex items-center justify-between border-b border-[var(--color-border-subtle)] shrink-0">
    {#if !collapsed}
      <button class="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-lift)] text-left w-full transition-colors group">
        <div class="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-accent-emerald)]/15 border border-[var(--color-emerald-border)] flex items-center justify-center text-[var(--color-accent-emerald)] shrink-0">
          <Box size={14} strokeWidth={2.5} />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] truncate leading-none">Buff Pipeline</div>
          <div class="text-[10px] font-[var(--font-general-sans)] text-[var(--color-ink-secondary)] truncate leading-none mt-1">Cold Call Cockpit</div>
        </div>
        <ChevronDown size={14} class="text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink-secondary)] transition-colors shrink-0" />
      </button>
    {:else}
      <div class="w-full flex justify-center">
        <div class="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-accent-emerald)]/15 border border-[var(--color-emerald-border)] flex items-center justify-center text-[var(--color-accent-emerald)]" data-tooltip="Buff Pipeline">
          <Box size={16} strokeWidth={2.5} />
        </div>
      </div>
    {/if}
  </div>

  <!-- Navigation Content -->
  <div class="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-5">
    <!-- Main Links Section -->
    <div class="flex flex-col gap-0.5">
      {#if !collapsed}
        <div class="px-2 pb-1.5 text-[10px] font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
          Navigation
        </div>
      {/if}

      {#each mainLinks as link}
        {@const isActive = $page.url.pathname === link.href}
        <a
          href={link.href}
          class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-[13px] font-[var(--font-general-sans)] transition-all group relative {collapsed ? 'justify-center' : ''} {isActive ? 'bg-[var(--color-surface-lift)] text-[var(--color-ink-primary)] font-medium' : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-lift)]/60'}"
          data-tooltip={collapsed ? link.label : undefined}
        >
          {#if isActive}
            <div class="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-[var(--color-accent-emerald)] rounded-r-full"></div>
          {/if}
          
          <link.icon size={16} class={isActive ? 'text-[var(--color-accent-emerald)]' : 'text-[var(--color-ink-secondary)] group-hover:text-[var(--color-ink-primary)] transition-colors'} />
          
          {#if !collapsed}
            <span class="flex-1 truncate">{link.label}</span>
          {/if}
        </a>
      {/each}
    </div>

    <!-- Queues Section -->
    <div class="flex flex-col gap-0.5">
      {#if !collapsed}
        <div class="px-2 pb-1.5 text-[10px] font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
          Listen & Queues
        </div>
      {/if}

      {#each queueFilters as queue}
        <a
          href={queue.href}
          class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-[13px] font-[var(--font-general-sans)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)] hover:bg-[var(--color-surface-lift)]/60 transition-all group {collapsed ? 'justify-center' : ''}"
          data-tooltip={collapsed ? queue.label : undefined}
        >
          <queue.icon size={16} class="text-[var(--color-ink-secondary)] group-hover:text-[var(--color-ink-primary)] transition-colors" />
          
          {#if !collapsed}
            <span class="flex-1 truncate">{queue.label}</span>
            <span class="text-[11px] font-[var(--font-mono)] font-semibold px-1.5 py-0.2 rounded bg-[var(--color-surface-lift)] text-[var(--color-ink-secondary)] group-hover:text-[var(--color-ink-primary)]">
              {queue.count}
            </span>
          {/if}
        </a>
      {/each}
    </div>
  </div>

  <!-- Sidebar Footer -->
  <div class="p-2 border-t border-[var(--color-border-subtle)] flex flex-col gap-1 shrink-0">
    <!-- User / Profile -->
    <div class="flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-lift)]/50 transition-colors">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-6.5 h-6.5 rounded-full bg-[var(--color-accent-emerald)]/20 border border-[var(--color-accent-emerald)]/40 flex items-center justify-center text-[10px] font-bold text-[var(--color-accent-emerald)] font-[var(--font-mono)] shrink-0">
          {currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()}
        </div>
        {#if !collapsed}
          <div class="flex flex-col min-w-0">
            <span class="text-[12px] font-[var(--font-excon)] font-semibold text-[var(--color-ink-primary)] truncate leading-none">{currentUser.name}</span>
            <span class="text-[10px] text-[var(--color-ink-muted)] truncate leading-none mt-0.5">{currentUser.role || 'Sales'}</span>
          </div>
        {/if}
      </div>

      {#if !collapsed}
        <div class="flex items-center gap-1">
          <button 
            onclick={handleLogout}
            class="p-1 text-[var(--color-ink-muted)] hover:text-red-400 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-lift)] transition-colors"
            title="Profil wechseln / Abmelden"
          >
            <LogOut size={15} />
          </button>
          <button 
            onclick={toggleSidebar}
            class="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-lift)] transition-colors"
            title="Sidebar einklappen (⌘\)"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>
      {/if}
    </div>

    {#if collapsed}
      <button 
        onclick={handleLogout}
        class="w-full flex justify-center py-1.5 text-[var(--color-ink-muted)] hover:text-red-400 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-lift)] transition-colors"
        title="Profil wechseln / Abmelden"
      >
        <LogOut size={16} />
      </button>
      <button 
        onclick={toggleSidebar}
        class="w-full flex justify-center py-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-lift)] transition-colors"
        title="Sidebar ausklappen (⌘\)"
      >
        <PanelLeftOpen size={16} />
      </button>
    {/if}
  </div>
</aside>
