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
      // Step 1: Get list of matching lead IDs
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

      // Step 2: Process in chunks of 3 leads concurrently with live progress tracking
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

      batchSuccessMessage = `✓ Fertig! ${batchTotalCount} Leads verarbeitet, ${totalUpdated} erfolgreich aktualisiert.`;
      selectedLeadIds = [];
      await fetchLeads();
      setTimeout(() => batchSuccessMessage = null, 6000);
    } catch (e: any) {
      console.error('Batch process error:', e);
      batchSuccessMessage = `⚠️ Fehler bei der Verarbeitung: ${e.message}`;
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

<div class="min-h-screen bg-[var(--color-page-void)] text-[var(--color-ink-primary)] p-6 md:p-10 font-[var(--font-general-sans)] select-none">
  <div class="max-w-[1600px] mx-auto flex flex-col gap-6">

  <!-- Header Title -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="w-2 h-2 rounded-full bg-[var(--color-accent-emerald)]"></span>
        <span class="text-xs font-[var(--font-excon)] font-semibold uppercase tracking-wider text-[var(--color-accent-emerald)]">
          Lead Directory Engine
        </span>
      </div>
      <h1 class="text-2xl md:text-3xl font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)] tracking-tight">
        Erfasste Leads & Akquise-Queue ({leadsList.length})
      </h1>
      <p class="text-sm text-[var(--color-ink-secondary)] mt-1">
        Übersicht aller gescrapten Betriebe mit doppelter Telefonnummer (G-Maps & Impressum) und E-Mail Anreicherung.
      </p>
    </div>
  </div>

  <!-- STRUCTURED TOP ACTION TOOLBAR -->
  <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
    
    <!-- Left: Selected Count or Overview -->
    <div class="flex items-center gap-3">
      {#if selectedLeadIds.length > 0}
        <div class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
          <CheckCircle2 size={14} class="text-emerald-400" />
          <span>{selectedLeadIds.length} Leads ausgewählt</span>
          <button onclick={() => selectedLeadIds = []} class="text-xs text-neutral-400 hover:text-white underline ml-1 cursor-pointer">Auswahl aufheben</button>
        </div>
      {:else}
        <div class="flex items-center gap-2 text-xs font-[var(--font-excon)] font-bold text-[var(--color-ink-primary)]">
          <Sparkles size={16} class="text-emerald-400" />
          <span>Automatische Anreicherungs- & Audit Pipeline</span>
        </div>
      {/if}
    </div>

    <!-- Right: Responsive Action Button Group -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:flex md:items-center gap-2">
      
      {#if selectedLeadIds.length > 0}
        <button
          onclick={() => runEnrichAndAudit(selectedLeadIds, 'both')}
          disabled={isProcessingBatch}
          class="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md active:scale-95"
        >
          <Sparkles size={14} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span>⚡ Ausgewählte Anreichern & Auditen</span>
        </button>

        <button
          onclick={() => runEnrichAndAudit(selectedLeadIds, 're-audit')}
          disabled={isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-3 py-2 rounded-xl text-xs text-amber-300 font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          title="Führt für die ausgewählten Leads ein neues Re-Audit aus"
        >
          <RefreshCw size={14} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span>🔄 Re-Audit</span>
        </button>
      {:else}
        <!-- 1. Unangereicherte Anreichern -->
        <button
          onclick={() => runEnrichAndAudit(undefined, 'enrich')}
          disabled={isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-2 rounded-xl text-xs text-emerald-400 font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          title="Sucht nach fehlenden Inhabern, Impressum-Telefonnummern und E-Mails"
        >
          <Sparkles size={14} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span class="truncate">⚡ Anreichern</span>
        </button>

        <!-- 2. Websites Auditen (Un-audited) -->
        <button
          onclick={() => runEnrichAndAudit(undefined, 'audit')}
          disabled={isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-2 rounded-xl text-xs text-amber-300 font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          title="Führt ein kostenloses Website-Health & Conversion-Audit für neue Leads aus"
        >
          <Search size={14} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span class="truncate">🔍 Auditen</span>
        </button>

        <!-- 3. Existing Websites Re-Audit -->
        <button
          onclick={() => runEnrichAndAudit(undefined, 're-audit')}
          disabled={isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-3 py-2 rounded-xl text-xs text-cyan-300 font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          title="Erneuert das Website-Audit für bereits gescrapte Websites"
        >
          <RefreshCw size={14} class={isProcessingBatch ? 'animate-spin' : ''} />
          <span class="truncate">🔄 Re-Auditen</span>
        </button>
      {/if}

      <!-- Delete Website Leads -->
      {#if leadsWithWebsiteCount > 0}
        <button
          onclick={deleteLeadsWithWebsite}
          disabled={isDeleting || isProcessingBatch}
          class="flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-2 rounded-xl text-xs text-rose-300 font-medium transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          title="Löscht alle Leads aus der Queue, die bereits eine funktionierende Website besitzen"
        >
          <Trash2 size={13} />
          <span class="truncate">Löschen ({leadsWithWebsiteCount})</span>
        </button>
      {/if}

      <!-- Refresh Table -->
      <button 
        onclick={fetchLeads}
        class="flex items-center justify-center gap-1.5 bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] border border-[var(--color-border-subtle)] px-3 py-2 rounded-xl text-xs text-[var(--color-ink-secondary)] hover:text-white transition-all cursor-pointer shrink-0"
        title="Liste jetzt neu laden"
      >
        <RefreshCw size={14} class={loading || isProcessingBatch ? 'animate-spin' : ''} />
      </button>

    </div>
  </div>

  <!-- LIVE PROGRESS & STATUS BANNER -->
  {#if isProcessingBatch}
    <div class="bg-gradient-to-r from-emerald-500/15 via-amber-500/15 to-cyan-500/15 border border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-2 shadow-2xl backdrop-blur-xl animate-fadeIn">
      <div class="flex items-center justify-between text-xs font-[var(--font-excon)] font-bold">
        <div class="flex items-center gap-2 text-emerald-300">
          <RefreshCw size={16} class="animate-spin text-emerald-400" />
          <span>{batchStatusLabel}</span>
        </div>
        <span class="font-mono text-white">
          {batchProcessedCount} / {batchTotalCount} ({batchTotalCount > 0 ? Math.round((batchProcessedCount / batchTotalCount) * 100) : 0}%)
        </span>
      </div>

      <!-- Animated Progress Bar -->
      <div class="w-full bg-neutral-900/80 h-2.5 rounded-full overflow-hidden border border-neutral-800">
        <div 
          class="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
          style="width: {batchTotalCount > 0 ? Math.round((batchProcessedCount / batchTotalCount) * 100) : 0}%"
        ></div>
      </div>
    </div>
  {/if}

  {#if batchSuccessMessage}
    <div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
      <div class="flex items-center gap-2">
        <CheckCircle2 size={18} class="text-emerald-400" />
        <span>{batchSuccessMessage}</span>
      </div>
    </div>
  {/if}

  <!-- Search & Filter Controls -->
  <Card class="p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-[var(--color-surface-panel)]">
    <!-- Search Bar -->
    <div class="relative w-full md:w-80">
      <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
      <input 
        type="text" 
        bind:value={searchQuery}
        oninput={fetchLeads}
        placeholder="Firma, Telefon, Ort oder Branche suchen..." 
        class="w-full bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] focus:border-[var(--color-border-focus)] rounded-[var(--radius-md)] pl-9 pr-3 py-1.5 text-xs text-[var(--color-ink-primary)] placeholder-[var(--color-ink-muted)] focus:outline-none transition-colors" 
      />
    </div>

    <!-- Filter Dropdowns & Sort -->
    <div class="flex items-center gap-3 w-full md:w-auto flex-wrap">
      
      <!-- Industry Filter -->
      <div class="flex items-center gap-1.5 text-xs">
        <Building2 size={14} class="text-[var(--color-ink-muted)] shrink-0" />
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
        <Filter size={14} class="text-[var(--color-ink-muted)] shrink-0" />
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
        </select>
      </div>

      <!-- Sort By Dropdown -->
      <div class="flex items-center gap-1.5 text-xs">
        <ArrowUpDown size={14} class="text-[var(--color-ink-muted)] shrink-0" />
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

  <!-- High-Density Business Directory Table -->
  <Card class="p-0 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-[var(--color-border-subtle)] bg-[var(--color-page-void)] text-[11px] font-[var(--font-excon)] font-bold uppercase tracking-wider text-[var(--color-ink-muted)] select-none">
            <th class="py-3 px-3 w-8 text-center">
              <input type="checkbox" checked={selectedLeadIds.length > 0 && selectedLeadIds.length === leadsList.length} onchange={toggleSelectAll} class="rounded cursor-pointer" />
            </th>
            <th class="py-3 px-4">Unternehmen / Firma</th>
            <th class="py-3 px-4">Branche / Kategorie</th>
            <th class="py-3 px-4 cursor-pointer hover:text-white" onclick={() => toggleSort('rating')}>
              <div class="flex items-center gap-1">
                <span>Rating</span>
                <ArrowUpDown size={12} />
              </div>
            </th>
            <th class="py-3 px-4">Standort</th>
            <th class="py-3 px-4">Telefonnummern (G-Maps & Impressum)</th>
            <th class="py-3 px-4">Anreicherungs-Daten</th>
            <th class="py-3 px-4 text-right">Aktion</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border-subtle)] text-xs font-[var(--font-general-sans)]">
          {#if loading}
            {#each Array(5) as _}
              <tr>
                <td class="p-4"><div class="h-4 w-40 bg-[var(--color-surface-lift)] animate-pulse rounded"></div></td>
                <td class="p-4"><div class="h-4 w-28 bg-[var(--color-surface-lift)] animate-pulse rounded"></div></td>
                <td class="p-4"><div class="h-4 w-16 bg-[var(--color-surface-lift)] animate-pulse rounded"></div></td>
                <td class="p-4"><div class="h-4 w-32 bg-[var(--color-surface-lift)] animate-pulse rounded"></div></td>
                <td class="p-4"><div class="h-4 w-28 bg-[var(--color-surface-lift)] animate-pulse rounded"></div></td>
                <td class="p-4"><div class="h-4 w-28 bg-[var(--color-surface-lift)] animate-pulse rounded"></div></td>
                <td class="p-4 text-right"><div class="h-7 w-20 bg-[var(--color-surface-lift)] animate-pulse rounded ml-auto"></div></td>
              </tr>
            {/each}
          {:else if leadsList.length === 0}
            <tr>
              <td colspan="7" class="py-12 text-center text-[var(--color-ink-secondary)]">
                Keine Unternehmen gefunden matching "{searchQuery}".
              </td>
            </tr>
          {:else}
            {#each leadsList as b}
              <tr class="hover:bg-[var(--color-surface-lift)]/60 transition-colors group {selectedLeadIds.includes(b.id) ? 'bg-emerald-500/5' : ''}">
                
                <!-- Checkbox -->
                <td class="py-3.5 px-3 text-center">
                  <input type="checkbox" checked={selectedLeadIds.includes(b.id)} onchange={() => toggleSelectLead(b.id)} class="rounded cursor-pointer" />
                </td>

                <!-- Company Name & Website -->
                <td class="py-3.5 px-4 font-medium text-[var(--color-ink-primary)]">
                  <div class="flex flex-col min-w-0 gap-0.5">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <a 
                        href={b.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + ' ' + (b.address || ''))}`}
                        target="_blank" 
                        rel="noreferrer"
                        class="font-[var(--font-excon)] font-bold text-sm text-[var(--color-ink-primary)] hover:text-[var(--color-accent-emerald)] transition-colors inline-flex items-center gap-1.5 group/link"
                        title="Auf Google Maps öffnen"
                      >
                        <span>{b.name}</span>
                        <ExternalLink size={12} class="text-[var(--color-ink-muted)] group-hover/link:text-[var(--color-accent-emerald)] transition-colors" />
                      </a>

                      {#if b.isAd}
                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0" title="Gesponserte Google Maps Anzeige">
                          📢 Ad
                        </span>
                      {/if}

                      {#if b.isClaimed === false}
                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0" title="Profil unbeansprucht (Super Sales Opportunity!)">
                          🔑 Unclaimed
                        </span>
                      {/if}

                      {#if b.auditScore !== null && b.auditScore !== undefined}
                        <span 
                          class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold font-mono border shrink-0 {b.auditScore < 50 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : (b.auditScore < 80 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30')}"
                          title={`Website Score: ${b.auditScore}/100`}
                        >
                          🏆 {b.auditScore}/100
                        </span>
                      {/if}
                    </div>

                    {#if b.decisionMaker}
                      <div class="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] px-1.5 py-0.5 rounded border border-[var(--color-accent-emerald)]/30 w-max mt-0.5">
                        <UserCheck size={11} class="shrink-0" />
                        <span>{b.decisionMaker}</span>
                      </div>
                    {/if}

                    {#if b.website}
                      <a href={b.website} target="_blank" rel="noreferrer" class="text-[11px] font-[var(--font-mono)] text-[var(--color-ink-muted)] hover:text-[var(--color-accent-emerald)] truncate max-w-[200px]">
                        {b.website.replace('https://', '').replace('http://', '')}
                      </a>
                    {/if}
                  </div>
                </td>

                <!-- Industry & Tech Stack -->
                <td class="py-3.5 px-4 text-[var(--color-ink-secondary)]">
                  <div class="flex flex-col gap-1">
                    <span class="font-medium text-[var(--color-ink-primary)]">{b.industry}</span>
                    {#if b.techStack}
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--color-surface-lift)] text-[var(--color-ink-primary)] border border-[var(--color-border-focus)] w-max">
                        <Code size={11} class="text-[var(--color-accent-emerald)] shrink-0" />
                        <span>{b.techStack}</span>
                      </span>
                    {/if}
                  </div>
                </td>

                <!-- Rating -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-1 font-[var(--font-mono)] text-xs">
                    <Star size={13} class="text-yellow-400 fill-yellow-400 shrink-0" />
                    <span class="font-bold text-[var(--color-ink-primary)]">{b.rating || '4.8'}</span>
                    <span class="text-[11px] text-[var(--color-ink-muted)]">({b.reviews || 0})</span>
                  </div>
                </td>

                <!-- Location -->
                <td class="py-3.5 px-4 text-[var(--color-ink-secondary)] truncate max-w-[180px]">
                  {b.address || 'Deutschland'}
                </td>

                <!-- Phone Numbers (G-Maps Zentrale & Impressum Direktwahl) -->
                <td class="py-3.5 px-4 font-[var(--font-mono)] text-[var(--color-ink-primary)] whitespace-nowrap">
                  <div class="flex flex-col gap-1">
                    <!-- G-Maps Phone -->
                    <div class="flex items-center gap-1.5 font-bold text-xs">
                      <Phone size={11} class="text-[var(--color-ink-muted)] shrink-0" />
                      <span>{b.phoneNumber}</span>
                      <button 
                        onclick={() => copyPhone(b.phoneNumber, b.id + '_gmaps')}
                        class="p-1 rounded bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] text-[var(--color-ink-secondary)] hover:text-white transition-colors cursor-pointer"
                        title="G-Maps Nummer kopieren"
                      >
                        {#if copiedPhoneId === b.id + '_gmaps'}
                          <Check size={11} class="text-[var(--color-accent-emerald)]" />
                        {:else}
                          <Copy size={11} />
                        {/if}
                      </button>
                    </div>

                    <!-- Enriched Impressum Phone -->
                    {#if b.websitePhone}
                      <div class="flex items-center gap-1.5 font-bold text-[11px] text-[var(--color-accent-emerald)] bg-[var(--color-emerald-tint)] px-1.5 py-0.5 rounded border border-[var(--color-accent-emerald)]/30">
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
                    {:else}
                      <span class="text-[10px] text-[var(--color-ink-muted)]">Nur G-Maps Zentrale</span>
                    {/if}
                  </div>
                </td>

                <!-- Enriched Email & Social Badges -->
                <td class="py-3.5 px-4 font-mono text-xs">
                  <div class="flex flex-col gap-1">
                    {#if b.email}
                      <span class="inline-flex items-center gap-1 text-[var(--color-accent-emerald)] font-semibold truncate max-w-[200px]" title={b.email}>
                        <CheckCircle2 size={12} class="shrink-0" />
                        <Mail size={12} class="shrink-0" />
                        <span>{b.email}</span>
                      </span>
                    {:else}
                      <span class="inline-flex items-center gap-1 text-[10px] text-rose-400/80">
                        <XCircle size={11} /> Keine E-Mail
                      </span>
                    {/if}

                    {#if b.facebook || b.instagram || b.linkedin}
                      <div class="flex items-center gap-1.5 text-[10px] text-blue-400">
                        <Share2 size={11} />
                        {#if b.linkedin}<a href={b.linkedin} target="_blank" class="hover:underline">LinkedIn</a>{/if}
                        {#if b.instagram}<a href={b.instagram} target="_blank" class="hover:underline">IG</a>{/if}
                        {#if b.facebook}<a href={b.facebook} target="_blank" class="hover:underline">FB</a>{/if}
                      </div>
                    {/if}
                  </div>
                </td>

                <!-- Actions -->
                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    {#if b.website}
                      <button
                        onclick={() => runEnrichAndAudit([b.id], 'both')}
                        disabled={isProcessingBatch}
                        class="px-2 py-1 rounded-[var(--radius-md)] bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] text-[var(--color-accent-emerald)] border border-[var(--color-border-focus)] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 text-[11px] font-bold"
                        title="Website Inhaber, Kontakte & Audit-Score für diesen Lead jetzt nachladen"
                      >
                        <Sparkles size={12} class={isProcessingBatch ? 'animate-spin' : ''} />
                        <span>Anreichern</span>
                      </button>

                      <button
                        onclick={() => runEnrichAndAudit([b.id], 're-audit')}
                        disabled={isProcessingBatch}
                        class="px-2 py-1 rounded-[var(--radius-md)] bg-[var(--color-surface-lift)] hover:bg-[var(--color-border-subtle)] text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 text-[11px] font-bold"
                        title="Erneutes Website-Audit für diesen Lead ausführen"
                      >
                        <RefreshCw size={11} class={isProcessingBatch ? 'animate-spin' : ''} />
                        <span>Re-Audit</span>
                      </button>
                    {/if}

                    <button 
                      onclick={() => deleteSingleLead(b.id, b.name)}
                      disabled={isDeleting}
                      class="p-1.5 rounded-[var(--radius-md)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                      title="Unternehmen löschen"
                    >
                      <Trash2 size={14} />
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
