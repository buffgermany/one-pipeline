<script lang="ts">
  import { onMount } from 'svelte';
  import Card from '$lib/components/Card.svelte';
  import Phone from 'lucide-svelte/icons/phone';
  import UploadCloud from 'lucide-svelte/icons/upload-cloud';
  import TrendingUp from 'lucide-svelte/icons/trending-up';
  import Clock from 'lucide-svelte/icons/clock';
  import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
  import ArrowUpRight from 'lucide-svelte/icons/arrow-up-right';
  import Inbox from 'lucide-svelte/icons/inbox';
  import PhoneCall from 'lucide-svelte/icons/phone-call';
  import Sparkles from 'lucide-svelte/icons/sparkles';
  import UserCheck from 'lucide-svelte/icons/user-check';
  import Code from 'lucide-svelte/icons/code';
  import Key from 'lucide-svelte/icons/key';
  import Layers from 'lucide-svelte/icons/layers';
  import History from 'lucide-svelte/icons/history';
  import Database from 'lucide-svelte/icons/database';

  let stats = $state({
    callsToday: 0,
    conversions: 0,
    remainingLeads: 0,
    totalLeads: 0,
    leadsWithDm: 0,
    dmRatePercent: 0,
    unclaimedGmbCount: 0
  });

  let techStackDistribution = $state<any[]>([]);
  let recentActivity = $state<any[]>([]);
  let loading = $state(true);

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        stats = { ...stats, ...data.stats };
        techStackDistribution = data.techStackDistribution || [];
        recentActivity = data.recentActivity || [];
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchDashboard();
  });
</script>

<div class="max-w-[1600px] mx-auto p-6 md:p-10 flex flex-col gap-6 select-none font-[var(--font-general-sans)]">
  
  <!-- MINIMALIST HEADER BANNER -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-subtle)]">
    <div>
      <div class="flex items-center gap-2.5">
        <h1 class="text-2xl md:text-3xl font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] tracking-tight">
          Guten Tag, Felix.
        </h1>
        <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/30">
          <div class="w-2 h-2 rounded-full bg-[var(--color-accent-emerald)] animate-ping"></div>
          <span class="text-[10px] font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)] uppercase tracking-wider">
            Akquise Engine Aktiv
          </span>
        </div>
      </div>
      <p class="text-xs font-[var(--font-general-sans)] text-[var(--color-ink-secondary)] mt-1">
        Echtzeit KPIs, Smart Anreicherung, Unclaimed GMB Opportunities & System Audit Trail.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <a 
        href="/import"
        class="flex items-center gap-2 bg-[var(--color-surface-panel)] hover:bg-[var(--color-surface-lift)] text-[var(--color-ink-primary)] border border-[var(--color-border-focus)] px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-[var(--font-excon)] font-bold transition-all shadow-sm"
      >
        <Sparkles size={15} class="text-[var(--color-accent-emerald)]" />
        <span>Scraper Starten</span>
      </a>

      <a 
        href="/call" 
        class="flex items-center gap-2 bg-[var(--color-accent-emerald)] hover:bg-[#059669] text-[#052E16] px-5 py-2.5 rounded-[var(--radius-md)] text-xs font-[var(--font-excon)] font-bold transition-all shadow-md"
      >
        <Phone size={15} strokeWidth={2.5} />
        <span>Cold Call Dialer Starten</span>
        <kbd class="hidden md:inline border border-black/20 rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-[var(--font-mono)] font-semibold ml-1">↵</kbd>
      </a>
    </div>
  </div>

  <!-- TOP BENTO KPI STAT CARDS (5 HIGH-DENSITY CARDS) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    
    <!-- CARD 1: CALLS TODAY -->
    <Card class="p-5 flex flex-col justify-between gap-3 bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] transition-all">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] uppercase tracking-wider">Anrufe Heute</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/30 px-2 py-0.5 rounded-[var(--radius-sm)]">
          <TrendingUp size={11} /> +14%
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-[var(--color-surface-lift)] animate-pulse rounded"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] leading-none">{stats.callsToday}</span>
          <span class="text-xs text-[var(--color-ink-secondary)]">Anrufe</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-[var(--color-surface-lift)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
        <div class="h-full bg-[var(--color-accent-emerald)] rounded-full" style="width: {Math.min(100, (stats.callsToday / 50) * 100)}%"></div>
      </div>
    </Card>

    <!-- CARD 2: CONVERSIONS -->
    <Card class="p-5 flex flex-col justify-between gap-3 bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] transition-all">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] uppercase tracking-wider">Termine Gebucht</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-excon)] font-bold text-[var(--color-status-amber)] bg-[var(--color-status-amber)]/10 border border-[var(--color-status-amber)]/30 px-2 py-0.5 rounded-[var(--radius-sm)]">
          <CheckCircle2 size={11} /> Ziel: 8
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-[var(--color-surface-lift)] animate-pulse rounded"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)] leading-none">{stats.conversions}</span>
          <span class="text-xs text-[var(--color-ink-secondary)]">Termine</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-[var(--color-surface-lift)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
        <div class="h-full bg-[var(--color-status-amber)] rounded-full" style="width: {Math.min(100, (stats.conversions / 8) * 100)}%"></div>
      </div>
    </Card>

    <!-- CARD 3: INHABER / DECISION MAKER RATE -->
    <Card class="p-5 flex flex-col justify-between gap-3 bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] transition-all">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] uppercase tracking-wider">Inhaber Erkennung</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-excon)] font-bold text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/30 px-2 py-0.5 rounded-[var(--radius-sm)]">
          <UserCheck size={11} /> High Quality
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-[var(--color-surface-lift)] animate-pulse rounded"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] leading-none">{stats.dmRatePercent}%</span>
          <span class="text-xs text-[var(--color-ink-secondary)]">({stats.leadsWithDm} Inhaber)</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-[var(--color-surface-lift)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
        <div class="h-full bg-[var(--color-accent-emerald)] rounded-full" style="width: {stats.dmRatePercent}%"></div>
      </div>
    </Card>

    <!-- CARD 4: UNCLAIMED GMB OPPORTUNITIES -->
    <Card class="p-5 flex flex-col justify-between gap-3 bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] transition-all">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] uppercase tracking-wider">Unclaimed GMB</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-excon)] font-bold text-[var(--color-status-amber)] bg-[var(--color-status-amber)]/10 border border-[var(--color-status-amber)]/30 px-2 py-0.5 rounded-[var(--radius-sm)]">
          <Key size={11} /> Pitch Chance
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-[var(--color-surface-lift)] animate-pulse rounded"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-bold text-[var(--color-status-amber)] leading-none">{stats.unclaimedGmbCount}</span>
          <span class="text-xs text-[var(--color-ink-secondary)]">Opportunities</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-[var(--color-surface-lift)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
        <div class="h-full bg-[var(--color-status-amber)] rounded-full" style="width: 70%"></div>
      </div>
    </Card>

    <!-- CARD 5: QUEUE REMAINING LEADS -->
    <Card class="p-5 flex flex-col justify-between gap-3 bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] transition-all">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-semibold text-[var(--color-ink-secondary)] uppercase tracking-wider">Queue Leads</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-mono)] font-bold text-[var(--color-ink-secondary)] bg-[var(--color-surface-lift)] px-2 py-0.5 rounded-[var(--radius-sm)]">
          <Database size={11} /> In DB
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-[var(--color-surface-lift)] animate-pulse rounded"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] leading-none">{stats.remainingLeads}</span>
          <span class="text-xs text-[var(--color-ink-secondary)]">bereit</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-[var(--color-surface-lift)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
        <div class="h-full bg-[var(--color-accent-emerald)] rounded-full" style="width: 85%"></div>
      </div>
    </Card>

  </div>

  <!-- MAIN DASHBOARD CONTENT: TECH STACK BREAKDOWN & AUDIT LOG ACTIVTY TRAIL -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    
    <!-- LEFT COLUMN: TECH STACK DISTRIBUTION & QUICK LINKS (1 COL) -->
    <div class="flex flex-col gap-6">
      
      <!-- TECH STACK DISTRIBUTION CARD -->
      <Card class="p-5 flex flex-col gap-4 bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)]">
        <div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div class="flex items-center gap-2">
            <Code size={16} class="text-[var(--color-accent-emerald)]" />
            <h3 class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] uppercase tracking-wider">
              Tech Stack & CMS Verteilung
            </h3>
          </div>
          <span class="text-[10px] font-mono text-[var(--color-ink-muted)]">Gescrapt</span>
        </div>

        {#if loading}
          <div class="flex flex-col gap-3 py-2">
            {#each Array(4) as _}
              <div class="h-6 w-full bg-[var(--color-surface-lift)] animate-pulse rounded"></div>
            {/each}
          </div>
        {:else if techStackDistribution.length === 0}
          <p class="text-xs text-[var(--color-ink-secondary)] py-4 text-center">Bisher noch keine Tech Stack Daten analysiert.</p>
        {:else}
          <div class="flex flex-col gap-3">
            {#each techStackDistribution as item}
              {@const pct = Math.round((item.count / (stats.totalLeads || 1)) * 100)}
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-mono font-semibold text-[var(--color-ink-primary)] flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-[var(--color-accent-emerald)]"></span>
                    {item.techStack}
                  </span>
                  <span class="font-mono text-[11px] text-[var(--color-ink-secondary)] font-bold">
                    {item.count} Leads ({pct}%)
                  </span>
                </div>
                <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
                  <div class="bg-[var(--color-accent-emerald)] h-full rounded-full" style="width: {Math.max(8, pct)}%"></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Card>

      <!-- QUICK NAVIGATION PANEL -->
      <Card class="p-5 flex flex-col gap-3 bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)]">
        <h3 class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2">
          Akquise Navigation
        </h3>

        <a href="/import" class="p-3 bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] flex items-center justify-between text-xs transition-colors group">
          <div class="flex items-center gap-2.5">
            <Sparkles size={16} class="text-[var(--color-accent-emerald)]" />
            <div>
              <span class="font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] block">Google Maps Live-Scraper</span>
              <span class="text-[10px] text-[var(--color-ink-secondary)]">Gmaps Scraping mit Inhaber & CMS Parser</span>
            </div>
          </div>
          <ArrowUpRight size={14} class="text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent-emerald)] transition-colors" />
        </a>

        <a href="/queue" class="p-3 bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] flex items-center justify-between text-xs transition-colors group">
          <div class="flex items-center gap-2.5">
            <Layers size={16} class="text-[var(--color-accent-emerald)]" />
            <div>
              <span class="font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] block">Lead Queue & Verzeichnis</span>
              <span class="text-[10px] text-[var(--color-ink-secondary)]">Queue verwalten, filtern & Duplikate prüfen</span>
            </div>
          </div>
          <ArrowUpRight size={14} class="text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent-emerald)] transition-colors" />
        </a>

        <a href="/call" class="p-3 bg-[var(--color-emerald-tint)] border border-[var(--color-accent-emerald)]/40 rounded-[var(--radius-md)] flex items-center justify-between text-xs transition-colors group">
          <div class="flex items-center gap-2.5">
            <PhoneCall size={16} class="text-[var(--color-accent-emerald)]" />
            <div>
              <span class="font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] block">Cold Call Dialer Cockpit</span>
              <span class="text-[10px] text-[var(--color-accent-emerald)] font-semibold">Geführter Leitfaden mit KI Einwand-Soundboard</span>
            </div>
          </div>
          <ArrowUpRight size={14} class="text-[var(--color-accent-emerald)] group-hover:translate-x-0.5 transition-transform" />
        </a>
      </Card>

    </div>

    <!-- RIGHT COLUMN: SYSTEM AUDIT LOG & RECENT ACTIVITY STREAM (2 COLS) -->
    <div class="lg:col-span-2 flex flex-col gap-4">
      
      <Card class="p-6 flex flex-col gap-5 bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)] shadow-lg">
        <div class="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
          <div class="flex items-center gap-2.5">
            <History size={18} class="text-[var(--color-accent-emerald)]" />
            <div>
              <h2 class="text-sm font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] tracking-tight">
                System Audit Log & Live Activity Stream
              </h2>
              <p class="text-[11px] text-[var(--color-ink-secondary)]">
                Protokollierte Anrufe, Scraper Imports, Wiedervorlagen & System-Ereignisse
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onclick={fetchDashboard}
            class="px-2.5 py-1 bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] border border-[var(--color-border-subtle)] rounded text-[11px] font-mono text-[var(--color-ink-secondary)] hover:text-white transition-colors cursor-pointer"
          >
            Aktualisieren
          </button>
        </div>

        {#if loading}
          <div class="flex flex-col gap-4 py-4">
            {#each Array(6) as _}
              <div class="h-12 w-full bg-[var(--color-surface-lift)] animate-pulse rounded-[var(--radius-md)]"></div>
            {/each}
          </div>
        {:else if recentActivity.length === 0}
          <div class="p-12 text-center text-xs text-[var(--color-ink-secondary)] flex flex-col items-center justify-center gap-2">
            <History size={28} class="text-[var(--color-ink-muted)] mb-1" />
            <span>Bisher noch keine Aktivitäten protokolliert.</span>
          </div>
        {:else}
          <div class="flex flex-col divide-y divide-[var(--color-border-subtle)]">
            {#each recentActivity as item}
              <div class="py-3 flex items-start justify-between gap-4 hover:bg-[var(--color-surface-lift)]/40 px-2 rounded-[var(--radius-md)] transition-colors">
                <div class="flex items-start gap-3 min-w-0">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 {item.type === 'call' ? 'bg-[var(--color-emerald-tint)] text-[var(--color-accent-emerald)] border border-[var(--color-accent-emerald)]/30' : 'bg-[var(--color-surface-lift)] text-purple-300 border border-purple-500/30'}">
                    {#if item.type === 'call'}
                      <PhoneCall size={14} />
                    {:else}
                      <UploadCloud size={14} />
                    {/if}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] truncate">
                      {item.title}
                    </span>
                    <span class="text-[11px] font-mono text-[var(--color-ink-secondary)] truncate">
                      {item.message}
                    </span>
                  </div>
                </div>

                <span class="text-[10px] font-mono font-semibold text-[var(--color-ink-muted)] shrink-0 bg-[var(--color-surface-lift)] px-2 py-0.5 rounded border border-[var(--color-border-subtle)]">
                  {item.time}
                </span>
              </div>
            {/each}
          </div>
        {/if}

      </Card>

    </div>

  </div>

</div>
