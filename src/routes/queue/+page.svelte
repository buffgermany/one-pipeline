<script lang="ts">
  import { onMount } from 'svelte';
  import Card from '$lib/components/Card.svelte';
  import Search from 'lucide-svelte/icons/search';
  import Filter from 'lucide-svelte/icons/filter';
  import PhoneCall from 'lucide-svelte/icons/phone-call';
  import Phone from 'lucide-svelte/icons/phone';
  import Star from 'lucide-svelte/icons/star';
  import Building2 from 'lucide-svelte/icons/building-2';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import Calendar from 'lucide-svelte/icons/calendar';
  import Copy from 'lucide-svelte/icons/copy';
  import Check from 'lucide-svelte/icons/check';
  import ArrowUpDown from 'lucide-svelte/icons/arrow-up-down';
  import Globe from 'lucide-svelte/icons/globe';
  import RefreshCw from 'lucide-svelte/icons/refresh-cw';
  import ExternalLink from 'lucide-svelte/icons/external-link';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import Mail from 'lucide-svelte/icons/mail';
  import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
  import XCircle from 'lucide-svelte/icons/x-circle';
  import Share2 from 'lucide-svelte/icons/share-2';
  import UserCheck from 'lucide-svelte/icons/user-check';
  import Code from 'lucide-svelte/icons/code';
  import Sparkles from 'lucide-svelte/icons/sparkles';
  import Clock from 'lucide-svelte/icons/clock';
  import ShieldAlert from 'lucide-svelte/icons/shield-alert';
  import Play from 'lucide-svelte/icons/play';
  import Megaphone from 'lucide-svelte/icons/megaphone';
  import Key from 'lucide-svelte/icons/key';

  let leadsList = $state<any[]>([]);
  let industriesList = $state<any[]>([]);
  let loading = $state(true);
  let isDeleting = $state(false);
  let selectedLeadIds = $state<string[]>([]);

  function toggleSelectLead(id: string) {
    if (selectedLeadIds.includes(id)) {
      selectedLeadIds = selectedLeadIds.filter(i => i !== id);
    } else {
      selectedLeadIds = [...selectedLeadIds, id];
    }
  }

  function toggleSelectAll() {
    if (selectedLeadIds.length === leadsList.length && leadsList.length > 0) {
      selectedLeadIds = [];
    } else {
      selectedLeadIds = leadsList.map(l => l.id);
    }
  }

  // Derived count of leads that have a website
  let leadsWithWebsiteCount = $derived(
    leadsList.filter(l => l.website && String(l.website).trim() !== '').length
  );

  // Derived KPI Stats for Header Bar
  let totalLeadsCount = $derived(leadsList.length);
  
  let readyLeadsCount = $derived(
    leadsList.filter(l => (l.websitePhone || l.phoneNumber) && (l.decisionMaker || (l.auditScore !== null && l.auditScore !== undefined))).length
  );

  let relaunchPotentialCount = $derived(
    leadsList.filter(l => (l.auditScore !== null && l.auditScore !== undefined && l.auditScore < 50) || l.auditData?.stats?.isCopyrightOutdated || l.isClaimed === false).length
  );

  let directContactRate = $derived(
    totalLeadsCount > 0 
      ? Math.round((leadsList.filter(l => l.websitePhone || l.email).length / totalLeadsCount) * 100) 
      : 0
  );

  // Filters & Sorting state
  let searchQuery = $state('');
  let selectedIndustry = $state('all');
  let selectedStatus = $state('all');
  let sortBy = $state('created_at');
  let sortOrder = $state<'asc' | 'desc'>('desc');

  let copiedPhoneId = $state<string | null>(null);

  async function fetchLeads() {
    loading = true;
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        industry: selectedIndustry,
        status: selectedStatus,
        sort: sortBy,
        order: sortOrder
      });

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        leadsList = data.leads || [];
        industriesList = data.industries || [];
      }
    } catch (e) {
      console.error('Failed to fetch leads:', e);
    } finally {
      loading = false;
    }
  }

  async function deleteSingleLead(leadId: string, name: string) {
    if (!confirm(`Möchtest du das Unternehmen "${name}" wirklich dauerhaft löschen?`)) return;
    try {
      isDeleting = true;
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId })
      });
      if (res.ok) {
        await fetchLeads();
      }
    } catch (e) {
      console.error('Failed to delete lead:', e);
    } finally {
      isDeleting = false;
    }
  }

  async function deleteLeadsWithWebsite() {
    if (leadsWithWebsiteCount === 0) return;
    if (!confirm(`Möchtest du wirklich ALLE Betriebe im System mit einer hinterlegten Website (${leadsWithWebsiteCount} Unternehmen) dauerhaft löschen?`)) return;

    try {
      isDeleting = true;
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_with_website' })
      });
      if (res.ok) {
        await fetchLeads();
      }
    } catch (e) {
      console.error('Failed to bulk delete website leads:', e);
    } finally {
      isDeleting = false;
    }
  }

  function copyPhone(phone: string, id: string) {
    navigator.clipboard.writeText(phone);
    copiedPhoneId = id;
    setTimeout(() => copiedPhoneId = null, 2000);
  }

  async function updateLeadStatus(leadId: string, newStatus: string) {
    try {
      const res = await fetch('/api/leads/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus })
      });
      if (res.ok) {
        await fetchLeads();
      }
    } catch (e) {
      console.error('Failed to update lead status:', e);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'rescheduled':
        return { label: 'Wiedervorlage', colorClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'in_progress':
        return { label: 'In Bearbeitung', colorClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
      case 'completed':
        return { label: 'Abgeschlossen', colorClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'cancelled':
        return { label: 'Absage', colorClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      default:
        return { label: 'Neu', colorClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30' };
    }
  }

  // Real-time Batch Progress Architecture
  let isProcessingBatch = $state(false);
  let batchStatusLabel = $state('');
  let batchProcessedCount = $state(0);
  let batchTotalCount = $state(0);
  let batchSuccessMessage = $state<string | null>(null);

  async function runEnrichAndAudit(leadIds?: string[], action: 'enrich' | 'audit' | 're-audit' | 'both' = 'both') {
    isProcessingBatch = true;
    batchSuccessMessage = null;
    batchProcessedCount = 0;
    batchTotalCount = 0;

    const actionNames: Record<string, string> = {
      enrich: 'Anreichern von Inhabern & Kontakten',
      audit: 'Website-Audits durchführen',
      're-audit': 'Erneutes Website-Re-Audit',
      both: 'Anreichern & Auditen'
    };

    const actionTitle = actionNames[action] || 'Verarbeiten';
    batchStatusLabel = `Initialisiere ${actionTitle}...`;

    try {
      const res = await fetch('/api/leads/enrich-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, action })
      });

      if (!res.ok) throw new Error('Fehler beim Abrufen der Lead-Liste.');
      const data = await res.json();

      const targetIds: string[] = data.leadIds || [];
      batchTotalCount = targetIds.length;

      if (batchTotalCount === 0) {
        batchSuccessMessage = data.message || 'Keine passenden Leads für diese Aktion gefunden.';
        setTimeout(() => batchSuccessMessage = null, 4000);
        return;
      }

      const chunkSize = 3;
      let totalUpdated = 0;

      for (let i = 0; i < targetIds.length; i += chunkSize) {
        const chunk = targetIds.slice(i, i + chunkSize);
        batchStatusLabel = `${actionTitle}: Verarbeite ${i + 1} bis ${Math.min(i + chunkSize, targetIds.length)} von ${batchTotalCount}...`;

        const chunkRes = await fetch('/api/leads/enrich-audit/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadIds: chunk })
        });

        if (chunkRes.ok) {
          const chunkData = await chunkRes.json();
          totalUpdated += chunkData.updatedCount || 0;
        }

        batchProcessedCount = Math.min(i + chunkSize, batchTotalCount);
      }

      batchSuccessMessage = `Fertig! ${batchTotalCount} Leads verarbeitet, ${totalUpdated} erfolgreich aktualisiert.`;
      selectedLeadIds = [];
      await fetchLeads();
      setTimeout(() => batchSuccessMessage = null, 6000);
    } catch (e: any) {
      console.error('Batch process error:', e);
      batchSuccessMessage = `Fehler bei der Verarbeitung: ${e.message}`;
      setTimeout(() => batchSuccessMessage = null, 6000);
    } finally {
      isProcessingBatch = false;
    }
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortOrder = 'desc';
    }
    fetchLeads();
  }

  onMount(() => {
    fetchLeads();
  });
</script>

<div class="min-h-screen bg-[var(--color-page-void)] text-[var(--color-ink-primary)] p-4 md:p-8 font-[var(--font-general-sans)] select-none">
  <div class="max-w-[1700px] mx-auto flex flex-col gap-5">

  <!-- 1. HEADER TITLE & TOP CTA -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="w-2 h-2 rounded-full bg-[var(--color-accent-emerald)]"></span>
        <span class="text-xs font-[var(--font-excon)] font-semibold text-[var(--color-accent-emerald)]">
          Lead Directory Engine
        </span>
      </div>
      <h1 class="text-2xl md:text-3xl font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] tracking-tight">
        Firmen-Verzeichnis & Akquise-Queue ({totalLeadsCount})
      </h1>
      <p class="text-xs text-[var(--color-ink-secondary)] mt-1">
        Zentrale Übersicht aller gescrapten B2B Betriebe mit Impressum-Anreicherung, Audit Scores & Kaltakquise Cockpit.
      </p>
    </div>

    <div class="flex items-center gap-2">
      <a 
        href="/call"
        class="px-4 py-2.5 rounded-[var(--radius-md)] btn-primary-emerald text-xs font-bold font-[var(--font-excon)] flex items-center gap-2 shadow-lg cursor-pointer active:scale-[0.98]"
      >
        <PhoneCall size={14} class="shrink-0" />
        <span>Anrufe starten</span>
      </a>
    </div>
  </div>

  <!-- 2. KPI STATS SUMMARY GRID (4 Cards) -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <!-- Stat 1: Total Leads -->
    <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-3.5 flex flex-col gap-1 shadow-sm">
      <div class="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span class="font-medium">Gesamt Leads in Queue</span>
        <Building2 size={14} class="text-[var(--color-accent-emerald)]" />
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-xl md:text-2xl font-bold font-[var(--font-mono)] text-[var(--color-ink-primary)]">{totalLeadsCount}</span>
        <span class="text-[11px] text-[var(--color-ink-muted)]">Betriebe</span>
      </div>
    </div>

    <!-- Stat 2: Ready for Cold Call -->
    <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-3.5 flex flex-col gap-1 shadow-sm">
      <div class="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span class="font-medium">Akquise-Bereit</span>
        <PhoneCall size={14} class="text-[var(--color-accent-emerald)]" />
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-xl md:text-2xl font-bold font-[var(--font-mono)] text-[var(--color-accent-emerald)]">{readyLeadsCount}</span>
        <span class="text-[11px] text-[var(--color-ink-muted)]">mit Telefon & Info</span>
      </div>
    </div>

    <!-- Stat 3: High Relaunch Potential -->
    <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-3.5 flex flex-col gap-1 shadow-sm">
      <div class="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span class="font-medium">Relaunch-Potenziale</span>
        <ShieldAlert size={14} class="text-[var(--color-status-amber)]" />
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-xl md:text-2xl font-bold font-[var(--font-mono)] text-[var(--color-status-amber)]">{relaunchPotentialCount}</span>
        <span class="text-[11px] text-[var(--color-ink-muted)]">Audit &lt; 50 / Alt-Copyright</span>
      </div>
    </div>

    <!-- Stat 4: Direct Contact Rate -->
    <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-3.5 flex flex-col gap-1 shadow-sm">
      <div class="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span class="font-medium">Direktkontakt-Quote</span>
        <UserCheck size={14} class="text-[var(--color-status-cyan)]" />
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-xl md:text-2xl font-bold font-[var(--font-mono)] text-[var(--color-status-cyan)]">{directContactRate}%</span>
        <span class="text-[11px] text-[var(--color-ink-muted)]">Imp.-Telefon / E-Mail</span>
      </div>
    </div>
  </div>

  <!-- 3. STRUCTURED TOP ACTION TOOLBAR -->
  <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
    
    <!-- Left: Selected Count or Info -->
    <div class="flex items-center gap-3">
      {#if selectedLeadIds.length > 0}
        <div class="flex items-center gap-2 bg-[var(--color-emerald-tint)] border border-[var(--color-emerald-border)] text-[var(--color-accent-emerald)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold font-[var(--font-mono)]">
          <CheckCircle2 size={14} class="text-[var(--color-accent-emerald)] shrink-0" />
          <span>{selectedLeadIds.length} Leads ausgewählt</span>
          <button onclick={() => selectedLeadIds = []} class="text-xs text-[var(--color-ink-muted)] hover:text-white underline ml-1 cursor-pointer">Auswahl aufheben</button>
        </div>
      {:else}
        <div class="flex items-center gap-2 text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">
          <Sparkles size={15} class="text-[var(--color-accent-emerald)] shrink-0" />
          <span>Pipeline Steuerung & Massen-Anreicherung</span>
        </div>
      {/if}
    </div>

    <!-- Right: Responsive Action Button Group -->
    <div class="grid grid-cols-2 sm:grid-cols-4 md:flex md:items-center gap-2">
      
      {#if selectedLeadIds.length > 0}
        <button
          onclick={() => runEnrichAndAudit(selectedLeadIds, 'both')}
          disabled={isProcessingBatch}
          class="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 bg-[var(--color-accent-emerald)] hover:bg-[#34D399] text-[#052E16] px-3.5 py-1.5 rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md active:scale-[0.98]"
        >
          <Sparkles size={13} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span>Ausgewählte Anreichern</span>
        </button>

        <button
          onclick={() => runEnrichAndAudit(selectedLeadIds, 're-audit')}
          disabled={isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] border border-[var(--color-border-subtle)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs text-[var(--color-status-amber)] font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          title="Führt für die ausgewählten Leads ein neues Re-Audit aus"
        >
          <RefreshCw size={13} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span>Re-Audit</span>
        </button>
      {:else}
        <!-- 1. Unangereicherte Anreichern -->
        <button
          onclick={() => runEnrichAndAudit(undefined, 'enrich')}
          disabled={isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] border border-[var(--color-border-subtle)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs text-[var(--color-accent-emerald)] font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          title="Sucht nach fehlenden Inhabern, Impressum-Telefonnummern und E-Mails"
        >
          <Sparkles size={13} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span class="truncate">Anreichern</span>
        </button>

        <!-- 2. Websites Auditen (Un-audited) -->
        <button
          onclick={() => runEnrichAndAudit(undefined, 'audit')}
          disabled={isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] border border-[var(--color-border-subtle)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs text-[var(--color-status-amber)] font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          title="Führt ein kostenloses Website-Health & Conversion-Audit für neue Leads aus"
        >
          <Search size={13} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span class="truncate">Auditen</span>
        </button>

        <!-- 3. Existing Websites Re-Audit -->
        <button
          onclick={() => runEnrichAndAudit(undefined, 're-audit')}
          disabled={isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-[var(--color-page-void)] hover:bg-[var(--color-surface-lift)] border border-[var(--color-border-subtle)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs text-[var(--color-status-cyan)] font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          title="Erneuert das Website-Audit für bereits gescrapte Websites"
        >
          <RefreshCw size={13} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span class="truncate">Re-Auditen</span>
        </button>
      {/if}

      <!-- Delete Website Leads -->
      {#if leadsWithWebsiteCount > 0}
        <button
          onclick={deleteLeadsWithWebsite}
          disabled={isDeleting || isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-[rgba(244,63,94,0.1)] hover:bg-[rgba(244,63,94,0.2)] border border-[rgba(244,63,94,0.3)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs text-[var(--color-status-rose)] font-medium transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          title="Löscht alle Leads aus der Queue, die bereits eine funktionierende Website besitzen"
        >
          <Trash2 size={13} />
          <span class="truncate">Löschen ({leadsWithWebsiteCount})</span>
        </button>
      {/if}

      <!-- Refresh Table -->
      <button 
        onclick={fetchLeads}
        class="flex items-center justify-center gap-1.5 bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] border border-[var(--color-border-subtle)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs text-[var(--color-ink-secondary)] hover:text-white transition-all cursor-pointer shrink-0"
        title="Liste jetzt neu laden"
      >
        <RefreshCw size={13} class={loading || isProcessingBatch ? 'animate-spin' : ''} />
      </button>

    </div>
  </div>

  <!-- LIVE PROGRESS & STATUS BANNER -->
  {#if isProcessingBatch}
    <div class="bg-[var(--color-surface-panel)] border border-[var(--color-emerald-border)] rounded-[var(--radius-lg)] p-3.5 flex flex-col gap-2 shadow-xl backdrop-blur-xl">
      <div class="flex items-center justify-between text-xs font-[var(--font-excon)] font-bold">
        <div class="flex items-center gap-2 text-[var(--color-accent-emerald)]">
          <RefreshCw size={14} class="animate-spin text-[var(--color-accent-emerald)] shrink-0" />
          <span>{batchStatusLabel}</span>
        </div>
        <span class="font-[var(--font-mono)] text-white">
          {batchProcessedCount} / {batchTotalCount} ({batchTotalCount > 0 ? Math.round((batchProcessedCount / batchTotalCount) * 100) : 0}%)
        </span>
      </div>

      <!-- Animated Progress Bar -->
      <div class="w-full bg-[var(--color-page-void)] h-2 rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
        <div 
          class="h-full bg-[var(--color-accent-emerald)] rounded-full transition-all duration-300"
          style="width: {batchTotalCount > 0 ? Math.round((batchProcessedCount / batchTotalCount) * 100) : 0}%"
        ></div>
      </div>
    </div>
  {/if}

  {#if batchSuccessMessage}
    <div class="bg-[var(--color-emerald-tint)] border border-[var(--color-emerald-border)] text-[var(--color-accent-emerald)] px-4 py-3 rounded-[var(--radius-md)] text-xs font-bold flex items-center justify-between shadow-lg">
      <div class="flex items-center gap-2">
        <CheckCircle2 size={16} class="text-[var(--color-accent-emerald)] shrink-0" />
        <span>{batchSuccessMessage}</span>
      </div>
    </div>
  {/if}

  <!-- 4. SEARCH & FILTER CONTROLS BAR -->
  <Card class="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 bg-[var(--color-surface-panel)] border-[var(--color-border-subtle)]">
    <!-- Search Bar -->
    <div class="relative w-full md:w-80">
      <Search size={13} class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
      <input 
        type="text" 
        bind:value={searchQuery}
        oninput={fetchLeads}
        placeholder="Firma, Telefon, Ort oder Branche suchen..." 
        class="w-full bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-border-focus)] rounded-[var(--radius-md)] pl-9 pr-3 py-1.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] focus:outline-none transition-colors" 
      />
    </div>

    <!-- Filter Dropdowns & Sort -->
    <div class="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
      
      <!-- Industry Filter -->
      <div class="flex items-center gap-1.5 text-xs">
        <Building2 size={13} class="text-[var(--color-ink-muted)] shrink-0" />
        <select 
          bind:value={selectedIndustry}
          onchange={fetchLeads}
          class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-[var(--color-ink-primary)] focus:outline-none cursor-pointer"
        >
          <option value="all">Alle Branchen ({industriesList.length})</option>
          {#each industriesList as ind}
            {#if ind.industry}
              <option value={ind.industry}>{ind.industry} ({ind.count})</option>
            {/if}
          {/each}
        </select>
      </div>

      <!-- Status Filter -->
      <div class="flex items-center gap-1.5 text-xs">
        <Filter size={13} class="text-[var(--color-ink-muted)] shrink-0" />
        <select 
          bind:value={selectedStatus}
          onchange={fetchLeads}
          class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-[var(--color-ink-primary)] focus:outline-none cursor-pointer"
        >
          <option value="all">Alle Status</option>
          <option value="new">Neu / Offen</option>
          <option value="rescheduled">Wiedervorlage / Terminiert</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="completed">Abgeschlossen</option>
          <option value="cancelled">Absage</option>
        </select>
      </div>

      <!-- Sort By Dropdown -->
      <div class="flex items-center gap-1.5 text-xs">
        <ArrowUpDown size={13} class="text-[var(--color-ink-muted)] shrink-0" />
        <select 
          bind:value={sortBy}
          onchange={fetchLeads}
          class="bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs text-[var(--color-ink-primary)] focus:outline-none cursor-pointer"
        >
          <option value="created_at">Sortieren: Erstellt</option>
          <option value="rating">Sortieren: Google Rating</option>
          <option value="reviews">Sortieren: Bewertungen</option>
          <option value="name">Sortieren: Name</option>
          <option value="reschedule_at">Sortieren: Wiedervorlage Date</option>
        </select>
      </div>

    </div>
  </Card>

  <!-- 5. HIGH-DENSITY BUSINESS DIRECTORY TABLE (8 Restructured Columns) -->
  <Card class="p-0 overflow-hidden border-[var(--color-border-subtle)]">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-[var(--color-border-subtle)] bg-[var(--color-page-void)] text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-muted)] select-none">
            <th class="py-3 px-3 w-8 text-center">
              <input type="checkbox" checked={selectedLeadIds.length > 0 && selectedLeadIds.length === leadsList.length} onchange={toggleSelectAll} class="rounded cursor-pointer" />
            </th>
            <th class="py-3 px-4">Unternehmen & Website</th>
            <th class="py-3 px-4">Ansprechpartner & E-Mail</th>
            <th class="py-3 px-4">Telefonnummern</th>
            <th class="py-3 px-4">Audit & WaaS-Potenzial</th>
            <th class="py-3 px-4 cursor-pointer hover:text-white" onclick={() => toggleSort('rating')}>
              <div class="flex items-center gap-1">
                <span>Bewertung & Ort</span>
                <ArrowUpDown size={11} />
              </div>
            </th>
            <th class="py-3 px-4">Status & Historie</th>
            <th class="py-3 px-4 text-right">Aktionen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border-subtle)] text-xs font-[var(--font-general-sans)]">
          {#if loading}
            {#each Array(5) as _}
              <tr>
                <td class="p-4"><div class="h-4 w-4 bg-[var(--color-surface-lift)] rounded"></div></td>
                <td class="p-4"><div class="h-4 w-40 bg-[var(--color-surface-lift)] rounded"></div></td>
                <td class="p-4"><div class="h-4 w-28 bg-[var(--color-surface-lift)] rounded"></div></td>
                <td class="p-4"><div class="h-4 w-32 bg-[var(--color-surface-lift)] rounded"></div></td>
                <td class="p-4"><div class="h-4 w-24 bg-[var(--color-surface-lift)] rounded"></div></td>
                <td class="p-4"><div class="h-4 w-28 bg-[var(--color-surface-lift)] rounded"></div></td>
                <td class="p-4"><div class="h-4 w-20 bg-[var(--color-surface-lift)] rounded"></div></td>
                <td class="p-4 text-right"><div class="h-7 w-20 bg-[var(--color-surface-lift)] rounded ml-auto"></div></td>
              </tr>
            {/each}
          {:else if leadsList.length === 0}
            <tr>
              <td colspan="8" class="py-12 text-center text-[var(--color-ink-secondary)]">
                Keine Unternehmen gefunden matching "{searchQuery}".
              </td>
            </tr>
          {:else}
            {#each leadsList as b}
              {@const statusInfo = getStatusBadge(b.status || 'new')}
              <tr class="hover:bg-[var(--color-surface-lift)]/60 transition-colors group {selectedLeadIds.includes(b.id) ? 'bg-[var(--color-emerald-tint)]' : ''}">
                
                <!-- 1. Checkbox -->
                <td class="py-3 px-3 text-center">
                  <input type="checkbox" checked={selectedLeadIds.includes(b.id)} onchange={() => toggleSelectLead(b.id)} class="rounded cursor-pointer" />
                </td>

                <!-- 2. Unternehmen & Website -->
                <td class="py-3 px-4 font-medium text-[var(--color-ink-primary)]">
                  <div class="flex flex-col min-w-0 gap-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <a 
                        href={b.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + ' ' + (b.address || ''))}`}
                        target="_blank" 
                        rel="noreferrer"
                        class="font-[var(--font-excon)] font-bold text-sm text-[var(--color-ink-primary)] hover:text-[var(--color-accent-emerald)] transition-colors inline-flex items-center gap-1 group/link"
                        title="Auf Google Maps öffnen"
                      >
                        <span>{b.name}</span>
                        <ExternalLink size={12} class="text-[var(--color-ink-muted)] group-hover/link:text-[var(--color-accent-emerald)] transition-colors" />
                      </a>

                      {#if b.isAd}
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0" title="Gesponserte Google Maps Anzeige">
                          <Megaphone size={10} class="shrink-0" />
                          <span>Ad</span>
                        </span>
                      {/if}

                      {#if b.isClaimed === false}
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0" title="Profil unbeansprucht (Super Sales Opportunity!)">
                          <Key size={10} class="shrink-0" />
                          <span>Unclaimed</span>
                        </span>
                      {/if}
                    </div>

                    <div class="flex items-center gap-2 text-xs">
                      <span class="text-[var(--color-ink-muted)] font-medium truncate max-w-[160px]">{b.industry || 'B2B Betrieb'}</span>
                      
                      {#if b.website}
                        <a 
                          href={b.website} 
                          target="_blank" 
                          rel="noreferrer" 
                          class="text-[11px] font-[var(--font-mono)] text-[var(--color-accent-emerald)] hover:underline truncate max-w-[180px] flex items-center gap-1"
                        >
                          <Globe size={10} class="shrink-0" />
                          <span>{b.website.replace('https://', '').replace('http://', '').replace('www.', '')}</span>
                        </a>
                      {:else}
                        <span class="text-[10px] text-[var(--color-status-rose)] font-mono">Keine Website</span>
                      {/if}
                    </div>
                  </div>
                </td>

                <!-- 3. Ansprechpartner & E-Mail -->
                <td class="py-3 px-4 text-[var(--color-ink-secondary)]">
                  <div class="flex flex-col gap-1">
                    {#if b.decisionMaker}
                      <div class="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] px-2 py-0.5 rounded border border-[var(--color-emerald-border)] w-max">
                        <UserCheck size={12} class="shrink-0" />
                        <span>{b.decisionMaker}</span>
                      </div>
                    {:else}
                      <span class="text-[11px] text-[var(--color-ink-muted)] italic">Inhaber unklar</span>
                    {/if}

                    <div class="flex items-center gap-2 flex-wrap">
                      {#if b.email}
                        <span class="inline-flex items-center gap-1 font-[var(--font-mono)] text-[11px] text-[var(--color-ink-primary)] truncate max-w-[190px]" title={b.email}>
                          <Mail size={11} class="text-[var(--color-accent-emerald)] shrink-0" />
                          <span>{b.email}</span>
                        </span>
                      {/if}

                      <!-- SVG Social Icons -->
                      {#if b.linkedin || b.instagram || b.facebook}
                        <div class="flex items-center gap-1.5 shrink-0">
                          {#if b.linkedin}
                            <a href={b.linkedin} target="_blank" rel="noreferrer" class="p-1 rounded bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] transition-colors" title="LinkedIn Profil">
                              <svg class="w-3 h-3 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.72a1.4 1.4 0 1 0 1.4 1.4 1.4 1.4 0 0 0-1.4-1.4z"/></svg>
                            </a>
                          {/if}
                          {#if b.instagram}
                            <a href={b.instagram} target="_blank" rel="noreferrer" class="p-1 rounded bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] transition-colors" title="Instagram Profil">
                              <svg class="w-3 h-3 text-[#E4405F]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 2.156 4.919 5.406.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 5.234-4.919 5.407-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-5.234-1.664-5.407-4.919-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-5.234 5.407-5.406 1.265-.058 1.644-.07 4.849-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            </a>
                          {/if}
                          {#if b.facebook}
                            <a href={b.facebook} target="_blank" rel="noreferrer" class="p-1 rounded bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] transition-colors" title="Facebook Profil">
                              <svg class="w-3 h-3 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </a>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  </div>
                </td>

                <!-- 4. Telefonnummern (G-Maps Zentrale & Impressum Direktwahl) -->
                <td class="py-3 px-4 font-[var(--font-mono)] text-[var(--color-ink-primary)] whitespace-nowrap">
                  <div class="flex flex-col gap-1">
                    <!-- G-Maps Phone -->
                    {#if b.phoneNumber}
                      <div class="flex items-center gap-1.5 font-bold text-xs">
                        <Phone size={11} class="text-[var(--color-ink-muted)] shrink-0" />
                        <span>{b.phoneNumber}</span>
                        <button 
                          onclick={() => copyPhone(b.phoneNumber, b.id + '_gmaps')}
                          class="p-1 rounded bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white transition-colors cursor-pointer"
                          title="G-Maps Zentrale kopieren"
                        >
                          {#if copiedPhoneId === b.id + '_gmaps'}
                            <Check size={11} class="text-[var(--color-accent-emerald)]" />
                          {:else}
                            <Copy size={11} />
                          {/if}
                        </button>
                      </div>
                    {:else}
                      <span class="text-[11px] text-[var(--color-ink-muted)]">Keine Zentrale</span>
                    {/if}

                    <!-- Enriched Impressum Phone -->
                    {#if b.websitePhone}
                      <div class="flex items-center gap-1.5 font-bold text-[11px] text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] px-1.5 py-0.5 rounded border border-[var(--color-emerald-border)] w-max">
                        <PhoneCall size={11} class="shrink-0" />
                        <span>{b.websitePhone}</span>
                        <button 
                          onclick={() => copyPhone(b.websitePhone, b.id + '_web')}
                          class="p-1 rounded bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white transition-colors cursor-pointer"
                          title="Impressum Direktwahl kopieren"
                        >
                          {#if copiedPhoneId === b.id + '_web'}
                            <Check size={11} class="text-[var(--color-accent-emerald)]" />
                          {:else}
                            <Copy size={11} />
                          {/if}
                        </button>
                      </div>
                    {/if}
                  </div>
                </td>

                <!-- 5. Audit & WaaS-Potenzial -->
                <td class="py-3 px-4">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      {#if b.auditScore !== null && b.auditScore !== undefined}
                        <span 
                          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold font-[var(--font-mono)] border shrink-0 {b.auditScore < 50 ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : (b.auditScore < 80 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30')}"
                          title={`Audit Score: ${b.auditScore}/100`}
                        >
                          <span>{b.auditScore}/100</span>
                        </span>
                      {:else}
                        <span class="text-[11px] text-[var(--color-ink-muted)]">Un-audited</span>
                      {/if}

                      {#if b.techStack}
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-[var(--font-mono)] font-semibold bg-[var(--color-surface-lift)] text-[var(--color-ink-primary)] border border-[var(--color-border-subtle)]">
                          <Code size={10} class="text-[var(--color-accent-emerald)] shrink-0" />
                          <span>{b.techStack}</span>
                        </span>
                      {/if}
                    </div>

                    {#if b.auditData?.stats?.copyrightYear}
                      <span class="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-muted)] flex items-center gap-1">
                        <Clock size={10} class={b.auditData.stats.isCopyrightOutdated ? 'text-rose-400' : 'text-[var(--color-ink-muted)]'} />
                        <span>© {b.auditData.stats.copyrightYear}</span>
                      </span>
                    {/if}
                  </div>
                </td>

                <!-- 6. Bewertung & Ort -->
                <td class="py-3 px-4 text-[var(--color-ink-secondary)]">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-1 font-[var(--font-mono)] text-xs">
                      <Star size={12} class="text-amber-400 fill-amber-400 shrink-0" />
                      <span class="font-bold text-[var(--color-ink-primary)]">{b.rating || 'N/A'}</span>
                      <span class="text-[10px] text-[var(--color-ink-muted)]">({b.reviews || 0})</span>
                    </div>

                    <span class="text-[11px] truncate max-w-[150px] flex items-center gap-1" title={b.address}>
                      <MapPin size={10} class="text-[var(--color-ink-muted)] shrink-0" />
                      <span class="truncate">{b.address || 'Deutschland'}</span>
                    </span>
                  </div>
                </td>

                <!-- 7. Status & Historie -->
                <td class="py-3 px-4">
                  <div class="flex flex-col gap-1">
                    <select
                      value={b.status || 'new'}
                      onchange={(e) => updateLeadStatus(b.id, (e.target as HTMLSelectElement).value)}
                      class="px-2 py-0.5 rounded text-[11px] font-bold font-[var(--font-excon)] border border-transparent cursor-pointer transition-colors {statusInfo.colorClass}"
                    >
                      <option value="new" class="bg-[var(--color-surface-panel)] text-white">Neu / Offen</option>
                      <option value="rescheduled" class="bg-[var(--color-surface-panel)] text-white">Wiedervorlage</option>
                      <option value="in_progress" class="bg-[var(--color-surface-panel)] text-white">In Bearbeitung</option>
                      <option value="completed" class="bg-[var(--color-surface-panel)] text-white">Abgeschlossen</option>
                      <option value="cancelled" class="bg-[var(--color-surface-panel)] text-white">Absage</option>
                    </select>

                    {#if b.callAttempts && b.callAttempts > 0}
                      <span class="text-[10px] font-[var(--font-mono)] text-[var(--color-ink-muted)]">
                        {b.callAttempts} {b.callAttempts === 1 ? 'Anruf' : 'Anrufe'}
                      </span>
                    {/if}
                  </div>
                </td>

                <!-- 8. Aktionen -->
                <td class="py-3 px-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <a
                      href={`/call?id=${b.id}`}
                      class="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-emerald)]/10 hover:bg-[var(--color-accent-emerald)]/20 text-[var(--color-accent-emerald)] border border-[var(--color-emerald-border)] transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-bold"
                      title="Jetzt Anruf-Cockpit für diesen Lead starten"
                    >
                      <PhoneCall size={12} />
                    </a>

                    {#if b.website}
                      <button
                        onclick={() => runEnrichAndAudit([b.id], 'both')}
                        disabled={isProcessingBatch}
                        class="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] text-[var(--color-accent-emerald)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 text-xs font-bold"
                        title="Website Inhaber, Kontakte & Audit-Score für diesen Lead jetzt nachladen"
                      >
                        <Sparkles size={12} class={isProcessingBatch ? 'animate-spin' : ''} />
                      </button>

                      <button
                        onclick={() => runEnrichAndAudit([b.id], 're-audit')}
                        disabled={isProcessingBatch}
                        class="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] text-[var(--color-status-amber)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 text-xs font-bold"
                        title="Erneutes Website-Audit für diesen Lead ausführen"
                      >
                        <RefreshCw size={12} class={isProcessingBatch ? 'animate-spin' : ''} />
                      </button>
                    {/if}

                    <button 
                      onclick={() => deleteSingleLead(b.id, b.name)}
                      disabled={isDeleting}
                      class="p-1.5 rounded-[var(--radius-md)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                      title="Unternehmen löschen"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>

              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </Card>

  </div>
</div>
