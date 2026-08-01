<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
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

  let userName = $derived($page.data.user?.name || 'Felix');

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

<div class="max-w-[1600px] mx-auto p-6 md:p-10 flex flex-col gap-8 select-none font-[var(--font-general-sans)] relative">
  
  <!-- Ambient Backlight Background Glows -->
  <div class="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>
  <div class="absolute bottom-10 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-[140px] pointer-events-none"></div>

  <!-- MINIMALIST HEADER BANNER WITH GRADIENT TYPOGRAPHY -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 relative z-10">
    <div>
      <div class="flex items-center gap-3">
        <h1 class="text-3xl md:text-4xl font-[var(--font-excon)] font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-400">
          Guten Tag, {userName}.
        </h1>
        <div class="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
          <div class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          <span class="text-[10px] font-[var(--font-excon)] font-bold text-emerald-400 uppercase tracking-wider">
            Akquise Engine Aktiv
          </span>
        </div>
      </div>
      <p class="text-xs sm:text-sm font-[var(--font-general-sans)] text-neutral-400 mt-1.5">
        Echtzeit KPIs, Anreicherung, Unclaimed GMB Opportunities & Activity Trail.
      </p>
    </div>

    <!-- PRIMARY ACTION BUTTONS -->
    <div class="flex items-center gap-3">
      <a 
        href="/import"
        class="flex items-center gap-2 bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-800 hover:border-neutral-700 px-4 py-2.5 rounded-xl text-xs font-[var(--font-excon)] font-bold transition-all shadow-sm cursor-pointer"
      >
        <Sparkles size={15} class="text-emerald-400" />
        <span>Scraper Starten</span>
      </a>

      <a 
        href="/call" 
        class="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 px-5 py-2.5 rounded-xl text-xs font-[var(--font-excon)] font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
      >
        <Phone size={15} strokeWidth={2.5} />
        <span>Cold Call Dialer Starten</span>
        <kbd class="hidden md:inline border border-black/20 rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-[var(--font-mono)] font-semibold ml-1">↵</kbd>
      </a>
    </div>
  </div>

  <!-- TOP BENTO KPI STAT CARDS (5 GLASS CARDS) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
    
    <!-- CARD 1: CALLS TODAY -->
    <div class="p-5 flex flex-col justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl backdrop-blur-xl hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-bold text-neutral-400 uppercase tracking-wider">Anrufe Heute</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-excon)] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <TrendingUp size={11} /> +14%
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-neutral-800/60 animate-pulse rounded-lg"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-extrabold text-white leading-none">{stats.callsToday}</span>
          <span class="text-xs text-neutral-400">Anrufe</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/60">
        <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style="width: {Math.min(100, (stats.callsToday / 50) * 100)}%"></div>
      </div>
    </div>

    <!-- CARD 2: CONVERSIONS -->
    <div class="p-5 flex flex-col justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl backdrop-blur-xl hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-bold text-neutral-400 uppercase tracking-wider">Termine Gebucht</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-excon)] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          <CheckCircle2 size={11} /> Ziel: 8
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-neutral-800/60 animate-pulse rounded-lg"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-extrabold text-emerald-400 leading-none">{stats.conversions}</span>
          <span class="text-xs text-neutral-400">Termine</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/60">
        <div class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style="width: {Math.min(100, (stats.conversions / 8) * 100)}%"></div>
      </div>
    </div>

    <!-- CARD 3: INHABER / DECISION MAKER RATE -->
    <div class="p-5 flex flex-col justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl backdrop-blur-xl hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-bold text-neutral-400 uppercase tracking-wider">Inhaber Erkennung</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-excon)] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <UserCheck size={11} /> High Quality
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-neutral-800/60 animate-pulse rounded-lg"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-extrabold text-white leading-none">{stats.dmRatePercent}%</span>
          <span class="text-xs text-neutral-400">({stats.leadsWithDm} Inhaber)</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/60">
        <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style="width: {stats.dmRatePercent}%"></div>
      </div>
    </div>

    <!-- CARD 4: UNCLAIMED GMB OPPORTUNITIES -->
    <div class="p-5 flex flex-col justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl backdrop-blur-xl hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-bold text-neutral-400 uppercase tracking-wider">Unclaimed GMB</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-excon)] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          <Key size={11} /> Pitch Chance
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-neutral-800/60 animate-pulse rounded-lg"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-extrabold text-amber-400 leading-none">{stats.unclaimedGmbCount}</span>
          <span class="text-xs text-neutral-400">Opportunities</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/60">
        <div class="h-full bg-amber-500 rounded-full" style="width: 70%"></div>
      </div>
    </div>

    <!-- CARD 5: QUEUE REMAINING LEADS -->
    <div class="p-5 flex flex-col justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl backdrop-blur-xl hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all duration-300">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-[var(--font-excon)] font-bold text-neutral-400 uppercase tracking-wider">Queue Leads</span>
        <span class="flex items-center gap-1 text-[10px] font-[var(--font-mono)] font-bold text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded-full border border-neutral-800">
          <Database size={11} /> In DB
        </span>
      </div>
      <div class="flex items-baseline gap-2">
        {#if loading}
          <div class="w-16 h-8 bg-neutral-800/60 animate-pulse rounded-lg"></div>
        {:else}
          <span class="text-3xl font-[var(--font-excon)] font-extrabold text-white leading-none">{stats.remainingLeads}</span>
          <span class="text-xs text-neutral-400">bereit</span>
        {/if}
      </div>
      <div class="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/60">
        <div class="h-full bg-emerald-500 rounded-full" style="width: 85%"></div>
      </div>
    </div>

  </div>

  <!-- MAIN DASHBOARD CONTENT -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
    
    <!-- LEFT COLUMN: TECH STACK DISTRIBUTION & QUICK LINKS -->
    <div class="flex flex-col gap-6">
      
      <!-- TECH STACK DISTRIBUTION CARD -->
      <div class="p-6 flex flex-col gap-4 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl backdrop-blur-xl shadow-xl">
        <div class="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div class="flex items-center gap-2">
            <Code size={16} class="text-emerald-400" />
            <h3 class="text-xs font-[var(--font-excon)] font-bold text-white uppercase tracking-wider">
              Tech Stack & CMS Verteilung
            </h3>
          </div>
          <span class="text-[10px] font-mono text-neutral-500">Gescrapt</span>
        </div>

        {#if loading}
          <div class="flex flex-col gap-3 py-2">
            {#each Array(4) as _}
              <div class="h-6 w-full bg-neutral-800/60 animate-pulse rounded-lg"></div>
            {/each}
          </div>
        {:else if techStackDistribution.length === 0}
          <p class="text-xs text-neutral-400 py-4 text-center">Bisher noch keine Tech Stack Daten analysiert.</p>
        {:else}
          <div class="flex flex-col gap-3">
            {#each techStackDistribution as item}
              {@const pct = Math.round((item.count / (stats.totalLeads || 1)) * 100)}
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-mono font-semibold text-white flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {item.techStack}
                  </span>
                  <span class="font-mono text-[11px] text-neutral-400 font-bold">
                    {item.count} Leads ({pct}%)
                  </span>
                </div>
                <div class="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800/60">
                  <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full" style="width: {Math.max(8, pct)}%"></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- QUICK NAVIGATION PANEL -->
      <div class="p-6 flex flex-col gap-3 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl backdrop-blur-xl shadow-xl">
        <h3 class="text-xs font-[var(--font-excon)] font-bold text-white uppercase tracking-wider border-b border-neutral-800/80 pb-3">
          Akquise Navigation
        </h3>

        <a href="/import" class="p-3.5 bg-neutral-950/80 hover:bg-neutral-800/80 rounded-xl border border-neutral-800 hover:border-neutral-700 flex items-center justify-between text-xs transition-all group">
          <div class="flex items-center gap-3">
            <Sparkles size={16} class="text-emerald-400" />
            <div>
              <span class="font-[var(--font-excon)] font-bold text-white block">Google Maps Live-Scraper</span>
              <span class="text-[10px] text-neutral-400">Gmaps Scraping mit Inhaber & CMS Parser</span>
            </div>
          </div>
          <ArrowUpRight size={14} class="text-neutral-500 group-hover:text-emerald-400 transition-colors" />
        </a>

        <a href="/queue" class="p-3.5 bg-neutral-950/80 hover:bg-neutral-800/80 rounded-xl border border-neutral-800 hover:border-neutral-700 flex items-center justify-between text-xs transition-all group">
          <div class="flex items-center gap-3">
            <Layers size={16} class="text-emerald-400" />
            <div>
              <span class="font-[var(--font-excon)] font-bold text-white block">Lead Queue & Verzeichnis</span>
              <span class="text-[10px] text-neutral-400">Queue verwalten, filtern & Duplikate prüfen</span>
            </div>
          </div>
          <ArrowUpRight size={14} class="text-neutral-500 group-hover:text-emerald-400 transition-colors" />
        </a>

        <a href="/call" class="p-3.5 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs transition-all group">
          <div class="flex items-center gap-3">
            <PhoneCall size={16} class="text-emerald-400" />
            <div>
              <span class="font-[var(--font-excon)] font-bold text-white block">Cold Call Dialer Cockpit</span>
              <span class="text-[10px] text-emerald-400 font-semibold">Geführter Leitfaden mit KI Einwand-Soundboard</span>
            </div>
          </div>
          <ArrowUpRight size={14} class="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

    </div>

    <!-- RIGHT COLUMN: SYSTEM AUDIT LOG & RECENT ACTIVITY STREAM -->
    <div class="lg:col-span-2 flex flex-col gap-4">
      
      <div class="p-6 flex flex-col gap-5 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl backdrop-blur-xl shadow-xl">
        <div class="flex items-center justify-between border-b border-neutral-800/80 pb-4">
          <div class="flex items-center gap-3">
            <History size={18} class="text-emerald-400" />
            <div>
              <h2 class="text-sm font-[var(--font-excon)] font-bold text-white tracking-tight">
                System Audit Log & Live Activity Stream
              </h2>
              <p class="text-[11px] text-neutral-400">
                Protokollierte Anrufe, Scraper Imports, Wiedervorlagen & System-Ereignisse
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onclick={fetchDashboard}
            class="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-[11px] font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Aktualisieren
          </button>
        </div>

        {#if loading}
          <div class="flex flex-col gap-4 py-4">
            {#each Array(6) as _}
              <div class="h-12 w-full bg-neutral-800/60 animate-pulse rounded-xl"></div>
            {/each}
          </div>
        {:else if recentActivity.length === 0}
          <div class="p-12 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
            <History size={28} class="text-neutral-600 mb-1" />
            <span>Bisher noch keine Aktivitäten protokolliert.</span>
          </div>
        {:else}
          <div class="flex flex-col divide-y divide-neutral-800/80">
            {#each recentActivity as item}
              <div class="py-3 flex items-start justify-between gap-4 hover:bg-neutral-800/40 px-3 rounded-xl transition-colors">
                <div class="flex items-start gap-3 min-w-0">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 {item.type === 'call' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}">
                    {#if item.type === 'call'}
                      <PhoneCall size={14} />
                    {:else}
                      <UploadCloud size={14} />
                    {/if}
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-[var(--font-excon)] font-bold text-white truncate">
                      {item.title}
                    </span>
                    <span class="text-[11px] font-mono text-neutral-400 truncate">
                      {item.message}
                    </span>
                  </div>
                </div>

                <span class="text-[10px] font-mono font-semibold text-neutral-400 shrink-0 bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-800">
                  {item.time}
                </span>
              </div>
            {/each}
          </div>
        {/if}

      </div>

    </div>

  </div>

</div>
