<script lang="ts">
  import ShieldAlert from 'lucide-svelte/icons/shield-alert';
  import ShieldCheck from 'lucide-svelte/icons/shield-check';
  import Smartphone from 'lucide-svelte/icons/smartphone';
  import Zap from 'lucide-svelte/icons/zap';
  import Search from 'lucide-svelte/icons/search';
  import Target from 'lucide-svelte/icons/target';
  import Code from 'lucide-svelte/icons/code';
  import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
  import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
  import XCircle from 'lucide-svelte/icons/x-circle';
  import PhoneCall from 'lucide-svelte/icons/phone-call';
  import Building2 from 'lucide-svelte/icons/building-2';
  import CalendarCheck from 'lucide-svelte/icons/calendar-check';
  import Mail from 'lucide-svelte/icons/mail';
  import Copy from 'lucide-svelte/icons/copy';
  import Check from 'lucide-svelte/icons/check';
  import Clock from 'lucide-svelte/icons/clock';
  import Lock from 'lucide-svelte/icons/lock';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import ChevronDown from 'lucide-svelte/icons/chevron-down';

  let { auditData, auditScore = null } = $props<{
    auditData?: any;
    auditScore?: number | null;
  }>();

  let parsedAudit = $derived.by(() => {
    if (!auditData) return null;
    if (typeof auditData === 'object') return auditData;
    try {
      return JSON.parse(auditData);
    } catch {
      return null;
    }
  });

  let score = $derived(parsedAudit?.overallScore ?? auditScore ?? 0);
  let copiedPitchIndex = $state<number | null>(null);

  // Accordion toggle states (collapsed by default as requested)
  let problemsOpen = $state(false);
  let pitchOpen = $state(false);
  let strengthsOpen = $state(false);

  function getScoreBadgeClass(val: number) {
    if (val >= 80) return 'text-[var(--color-accent-emerald)] border-[var(--color-emerald-border)] bg-[var(--color-emerald-tint)]';
    if (val >= 50) return 'text-[var(--color-status-amber)] border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)]';
    return 'text-[var(--color-status-rose)] border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.12)]';
  }

  function getCircleColor(val: number) {
    if (val >= 80) return '#10B981';
    if (val >= 50) return '#F59E0B';
    return '#F43F5E';
  }

  async function copyPitch(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      copiedPitchIndex = index;
      setTimeout(() => {
        copiedPitchIndex = null;
      }, 2000);
    } catch (e) {
      console.error('Failed to copy pitch text', e);
    }
  }

  function getBookingBadge(stats: any) {
    const type = stats?.bookingType;
    if (type === 'third_party' || type === 'custom_calendar') {
      return {
        label: stats?.bookingProvider || 'Live-Kalender aktiv',
        colorClass: 'text-[var(--color-accent-emerald)] bg-emerald-500/15 border-emerald-500/30',
        icon: 'check'
      };
    }
    if (type === 'request_form') {
      return {
        label: 'Terminanfrage-Formular',
        colorClass: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
        icon: 'check'
      };
    }
    if (type === 'general_contact' || stats?.hasContactForm) {
      return {
        label: 'Standard Kontaktformular',
        colorClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        icon: 'mail'
      };
    }
    return {
      label: 'Kein Formular / Nur Anruf',
      colorClass: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
      icon: 'x'
    };
  }
</script>

{#if !parsedAudit}
  <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-5 text-xs text-[var(--color-ink-muted)] flex items-center gap-3">
    <AlertTriangle size={16} class="text-[var(--color-ink-muted)] shrink-0" />
    <span>Kein Website-Audit verfügbar (noch nicht analysiert oder keine Homepage erfasst).</span>
  </div>
{:else}
  <div class="bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-5 flex flex-col gap-5 shadow-sm">
    
    <!-- HEADER: SCORE GAUGE & AUDIT STATUS -->
    <div class="flex items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-[var(--radius-md)] border flex flex-col items-center justify-center font-bold shrink-0 {getScoreBadgeClass(score)}">
          <span class="text-lg leading-none font-[var(--font-excon)]">{score}</span>
          <span class="text-[9px] opacity-70 mt-0.5">/ 100</span>
        </div>

        <div class="flex flex-col gap-0.5">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-sm font-bold text-[var(--color-ink-primary)] font-[var(--font-excon)]">
              Website Health & WaaS Intelligence Audit
            </h3>
            
            {#if parsedAudit.stats?.industryLabel}
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-surface-lift)] text-[var(--color-ink-secondary)] border border-[var(--color-border-subtle)] flex items-center gap-1">
                <Building2 size={11} class="shrink-0 text-[var(--color-accent-emerald)]" />
                <span>{parsedAudit.stats.industryLabel}</span>
              </span>
            {/if}

            {#if score < 50}
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Redesign & WaaS Potential
              </span>
            {:else if score < 80}
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Ausbaufähig
              </span>
            {:else}
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Gut optimiert
              </span>
            {/if}
          </div>
          <p class="text-xs text-[var(--color-ink-muted)]">
            Tiefen-Audit: Formular & Kalender, Custom Cookie Banner, DSGVO, Schema.org SEO & WaaS-Potenzial.
          </p>
        </div>
      </div>
    </div>

    <!-- 6 SUB-CATEGORY SCORE CARDS WITH SVG CIRCULAR PROGRESS RINGS -->
    {#if parsedAudit.scores}
      {@const mobileScore = parsedAudit.scores.mobileUX ?? 0}
      {@const dsgvoScore = parsedAudit.scores.securityDSGVO ?? parsedAudit.scores.security ?? 0}
      {@const conversionScore = parsedAudit.scores.conversionLeads ?? parsedAudit.scores.conversion ?? 0}
      {@const seoScore = parsedAudit.scores.localSEO ?? parsedAudit.scores.seo ?? 0}
      {@const speedScore = parsedAudit.scores.performance ?? 0}
      {@const techScore = parsedAudit.scores.techModernity ?? 0}

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        
        <!-- 1. Mobile & UX -->
        <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-2 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Smartphone size={13} class="text-[var(--color-accent-emerald)] shrink-0" />
              <span>Mobil & UX</span>
            </span>
            <span class="text-xs font-bold text-[var(--color-ink-primary)]">
              {mobileScore < 50 ? 'Optimierung' : (mobileScore < 80 ? 'Gute Basis' : 'Sehr gut')}
            </span>
          </div>

          <div class="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg class="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-[var(--color-surface-lift)]" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke-width="3" stroke-dasharray="100, 100" stroke-dashoffset={100 - mobileScore} stroke-linecap="round" stroke={getCircleColor(mobileScore)} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold font-[var(--font-mono)] text-[var(--color-ink-primary)]">{mobileScore}%</span>
          </div>
        </div>

        <!-- 2. DSGVO & Recht -->
        <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-2 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider flex items-center gap-1.5 truncate">
              <ShieldCheck size={13} class="text-[var(--color-accent-emerald)] shrink-0" />
              <span>DSGVO & Recht</span>
            </span>
            <span class="text-xs font-bold text-[var(--color-ink-primary)]">
              {dsgvoScore < 50 ? 'Risiko' : (dsgvoScore < 80 ? 'Teilweise' : 'Konform')}
            </span>
          </div>

          <div class="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg class="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-[var(--color-surface-lift)]" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke-width="3" stroke-dasharray="100, 100" stroke-dashoffset={100 - dsgvoScore} stroke-linecap="round" stroke={getCircleColor(dsgvoScore)} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold font-[var(--font-mono)] text-[var(--color-ink-primary)]">{dsgvoScore}%</span>
          </div>
        </div>

        <!-- 3. Conversion & Funnel -->
        <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-2 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Target size={13} class="text-[var(--color-accent-emerald)] shrink-0" />
              <span>Conversion</span>
            </span>
            <span class="text-xs font-bold text-[var(--color-ink-primary)]">
              {conversionScore < 50 ? 'Gering' : (conversionScore < 80 ? 'Mittel' : 'Hoch')}
            </span>
          </div>

          <div class="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg class="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-[var(--color-surface-lift)]" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke-width="3" stroke-dasharray="100, 100" stroke-dashoffset={100 - conversionScore} stroke-linecap="round" stroke={getCircleColor(conversionScore)} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold font-[var(--font-mono)] text-[var(--color-ink-primary)]">{conversionScore}%</span>
          </div>
        </div>

        <!-- 4. Local SEO & SERP -->
        <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-2 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Search size={13} class="text-[var(--color-accent-emerald)] shrink-0" />
              <span>Local SEO</span>
            </span>
            <span class="text-xs font-bold text-[var(--color-ink-primary)]">
              {seoScore < 50 ? 'Schwach' : (seoScore < 80 ? 'Solide' : 'Aktiv')}
            </span>
          </div>

          <div class="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg class="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-[var(--color-surface-lift)]" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke-width="3" stroke-dasharray="100, 100" stroke-dashoffset={100 - seoScore} stroke-linecap="round" stroke={getCircleColor(seoScore)} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold font-[var(--font-mono)] text-[var(--color-ink-primary)]">{seoScore}%</span>
          </div>
        </div>

        <!-- 5. Speed & Assets -->
        <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-2 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Zap size={13} class="text-[var(--color-accent-emerald)] shrink-0" />
              <span>Speed</span>
            </span>
            <span class="text-xs font-bold text-[var(--color-ink-primary)]">
              {speedScore < 50 ? 'Langsam' : (speedScore < 80 ? 'Mittel' : 'Schnell')}
            </span>
          </div>

          <div class="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg class="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-[var(--color-surface-lift)]" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke-width="3" stroke-dasharray="100, 100" stroke-dashoffset={100 - speedScore} stroke-linecap="round" stroke={getCircleColor(speedScore)} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold font-[var(--font-mono)] text-[var(--color-ink-primary)]">{speedScore}%</span>
          </div>
        </div>

        <!-- 6. Tech Modernity -->
        <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-2 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Code size={13} class="text-[var(--color-accent-emerald)] shrink-0" />
              <span>Tech Stack</span>
            </span>
            <span class="text-xs font-bold text-[var(--color-ink-primary)]">
              {techScore < 50 ? 'Veraltet' : (techScore < 80 ? 'Standard' : 'Modern')}
            </span>
          </div>

          <div class="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg class="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
              <path class="text-[var(--color-surface-lift)]" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path stroke-width="3" stroke-dasharray="100, 100" stroke-dashoffset={100 - techScore} stroke-linecap="round" stroke={getCircleColor(techScore)} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <span class="absolute text-[11px] font-bold font-[var(--font-mono)] text-[var(--color-ink-primary)]">{techScore}%</span>
          </div>
        </div>

      </div>
    {/if}

    <!-- 3 ACCORDIONS (UNIFIED DESIGN, COLLAPSED BY DEFAULT) -->
    
    <!-- ACCORDION 1: ERKANNTE SCHWACHSTELLEN & RELAUNCH-POTENZIALE -->
    {#if parsedAudit.problems && parsedAudit.problems.length > 0}
      <div class="flex flex-col gap-2">
        <button
          onclick={() => problemsOpen = !problemsOpen}
          class="w-full p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[rgba(244,63,94,0.25)] hover:border-[rgba(244,63,94,0.4)] flex items-center justify-between gap-3 text-left transition-all cursor-pointer active:scale-[0.98]"
        >
          <div class="flex items-center gap-2 min-w-0">
            <ShieldAlert size={15} class="text-[var(--color-status-rose)] shrink-0" />
            <span class="text-xs font-bold text-[var(--color-status-rose)] font-[var(--font-excon)] truncate">
              Erkannte Schwachstellen & Relaunch-Potenziale
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold font-[var(--font-mono)] bg-[rgba(244,63,94,0.15)] text-[var(--color-status-rose)] border border-[rgba(244,63,94,0.3)] shrink-0">
              {parsedAudit.problems.length}
            </span>
          </div>

          <div class="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] shrink-0">
            <span>{problemsOpen ? 'Einklappen' : 'Ausklappen'}</span>
            <ChevronDown size={14} class="transition-transform duration-200 {problemsOpen ? 'rotate-180' : ''}" />
          </div>
        </button>

        {#if problemsOpen}
          <div class="flex flex-col gap-1.5 pl-1 pt-1">
            {#each parsedAudit.problems as problem}
              <div class="p-2.5 rounded-[var(--radius-sm)] bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.2)] text-xs text-[var(--color-status-rose)] flex items-start gap-2">
                <AlertTriangle size={14} class="shrink-0 mt-0.5" />
                <span class="leading-normal">{problem}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- ACCORDION 2: VERKAUFSARGUMENTE FÜR WEBSITE-RELAUNCH & WAAS-FLATRATE -->
    {#if parsedAudit.pitchPoints && parsedAudit.pitchPoints.length > 0}
      <div class="flex flex-col gap-2">
        <button
          onclick={() => pitchOpen = !pitchOpen}
          class="w-full p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[rgba(245,158,11,0.25)] hover:border-[rgba(245,158,11,0.4)] flex items-center justify-between gap-3 text-left transition-all cursor-pointer active:scale-[0.98]"
        >
          <div class="flex items-center gap-2 min-w-0">
            <PhoneCall size={15} class="text-[var(--color-status-amber)] shrink-0" />
            <span class="text-xs font-bold text-[var(--color-status-amber)] font-[var(--font-excon)] truncate">
              Verkaufsargumente für Website-Relaunch & WaaS-Flatrate
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold font-[var(--font-mono)] bg-[rgba(245,158,11,0.15)] text-[var(--color-status-amber)] border border-[rgba(245,158,11,0.3)] shrink-0">
              {parsedAudit.pitchPoints.length} Sätze
            </span>
          </div>

          <div class="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] shrink-0">
            <span>{pitchOpen ? 'Einklappen' : 'Ausklappen'}</span>
            <ChevronDown size={14} class="transition-transform duration-200 {pitchOpen ? 'rotate-180' : ''}" />
          </div>
        </button>

        {#if pitchOpen}
          <ul class="flex flex-col gap-2 pl-1 pt-1">
            {#each parsedAudit.pitchPoints as pitch, idx}
              <li class="text-xs text-[var(--color-ink-primary)] bg-[var(--color-surface-panel)] border border-[rgba(245,158,11,0.18)] p-2.5 rounded-[var(--radius-sm)] flex items-start justify-between gap-3 leading-relaxed group">
                <div class="flex items-start gap-2">
                  <span class="text-[var(--color-status-amber)] font-bold font-[var(--font-mono)] text-sm leading-none mt-0.5">•</span>
                  <span>{pitch}</span>
                </div>
                <button
                  onclick={() => copyPitch(pitch, idx)}
                  class="opacity-60 hover:opacity-100 transition-opacity p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-status-amber)] shrink-0 cursor-pointer"
                  title="Satz kopieren"
                >
                  {#if copiedPitchIndex === idx}
                    <Check size={13} class="text-[var(--color-accent-emerald)]" />
                  {:else}
                    <Copy size={13} />
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}

    <!-- ACCORDION 3: BESTEHENDE STÄRKEN DER WEBSITE -->
    {#if parsedAudit.positiveHighlights && parsedAudit.positiveHighlights.length > 0}
      <div class="flex flex-col gap-2">
        <button
          onclick={() => strengthsOpen = !strengthsOpen}
          class="w-full p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-emerald-border)] hover:border-[var(--color-accent-emerald)] flex items-center justify-between gap-3 text-left transition-all cursor-pointer active:scale-[0.98]"
        >
          <div class="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={15} class="text-[var(--color-accent-emerald)] shrink-0" />
            <span class="text-xs font-bold text-[var(--color-accent-emerald)] font-[var(--font-excon)] truncate">
              Bestehende Stärken der Website
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold font-[var(--font-mono)] bg-[var(--color-emerald-tint)] text-[var(--color-accent-emerald)] border border-[var(--color-emerald-border)] shrink-0">
              {parsedAudit.positiveHighlights.length}
            </span>
          </div>

          <div class="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] shrink-0">
            <span>{strengthsOpen ? 'Einklappen' : 'Ausklappen'}</span>
            <ChevronDown size={14} class="transition-transform duration-200 {strengthsOpen ? 'rotate-180' : ''}" />
          </div>
        </button>

        {#if strengthsOpen}
          <div class="flex flex-col gap-1.5 pl-1 pt-1">
            {#each parsedAudit.positiveHighlights as highlight}
              <div class="text-xs text-[var(--color-ink-secondary)] bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] p-2 rounded-[var(--radius-sm)] flex items-center gap-2">
                <CheckCircle2 size={13} class="text-[var(--color-accent-emerald)] shrink-0" />
                <span>{highlight}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- MEASURED INFRASTRUCTURE MATRIX (UNIFIED CARD DESIGN) -->
    {#if parsedAudit.stats}
      {@const bookingBadge = getBookingBadge(parsedAudit.stats)}
      <div class="flex flex-col gap-2.5 border-t border-[var(--color-border-subtle)] pt-4">
        <span class="text-xs font-bold text-[var(--color-ink-muted)] font-[var(--font-excon)] uppercase tracking-wider">
          Technische Infrastruktur & WaaS-Kennzahlen
        </span>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          
          <!-- CMS -->
          <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col justify-between gap-1 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider">CMS / SYSTEM</span>
            <span class="text-xs font-bold text-[var(--color-ink-primary)] truncate" title={parsedAudit.stats.cmsName}>{parsedAudit.stats.cmsName || 'Eigenentwicklung'}</span>
          </div>

          <!-- COPYRIGHT -->
          <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col justify-between gap-1 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider">COPYRIGHT-STAND</span>
            <span class="text-xs font-bold flex items-center gap-1.5 {parsedAudit.stats.isCopyrightOutdated ? 'text-rose-400' : 'text-[var(--color-accent-emerald)]'}">
              <Clock size={13} class="shrink-0" />
              <span>{parsedAudit.stats.copyrightYear ? `© ${parsedAudit.stats.copyrightYear}` : 'Nicht angegeben'}</span>
            </span>
          </div>

          <!-- BOOKING -->
          <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col justify-between gap-1 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider">KONTAKT & BUCHUNG</span>
            <span class="text-xs font-bold flex items-center gap-1.5 truncate px-1.5 py-0.5 rounded text-[11px] border {bookingBadge.colorClass}">
              {#if bookingBadge.icon === 'check'}
                <CalendarCheck size={12} class="shrink-0" />
              {:else if bookingBadge.icon === 'mail'}
                <Mail size={12} class="shrink-0" />
              {:else}
                <XCircle size={12} class="shrink-0" />
              {/if}
              <span class="truncate">{bookingBadge.label}</span>
            </span>
          </div>

          <!-- DSGVO -->
          <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col justify-between gap-1 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider">DSGVO BANNER & FONTS</span>
            <span class="text-xs font-bold flex items-center gap-1.5 truncate text-[11px] {parsedAudit.stats.hasGoogleFontsExternal && !parsedAudit.stats.hasCookieBanner ? 'text-amber-400' : 'text-[var(--color-ink-primary)]'}">
              <Lock size={12} class="shrink-0" />
              <span class="truncate">
                {#if parsedAudit.stats.hasGoogleFontsExternal && !parsedAudit.stats.hasCookieBanner}
                  Fonts direkt (Abmahnrisiko)
                {:else if parsedAudit.stats.hasCookieBanner}
                  {parsedAudit.stats.cookieBannerProvider || 'Consent Banner'}
                {:else}
                  Standard
                {/if}
              </span>
            </span>
          </div>

          <!-- LOCAL SEO -->
          <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col justify-between gap-1 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider">LOCAL SEO (SCHEMA.ORG)</span>
            <span class="text-xs font-bold flex items-center gap-1.5 {parsedAudit.stats.hasSchemaOrg ? 'text-[var(--color-accent-emerald)]' : 'text-amber-400'}">
              <MapPin size={12} class="shrink-0" />
              <span>{parsedAudit.stats.hasSchemaOrg ? 'Schema.org aktiv' : 'Fehlt'}</span>
            </span>
          </div>

          <!-- WEIGHT -->
          <div class="p-3 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col justify-between gap-1 shadow-sm transition-all hover:border-[var(--color-border-focus)]">
            <span class="text-[10px] text-[var(--color-ink-muted)] font-[var(--font-excon)] font-bold uppercase tracking-wider">SEITENGRÖSSE</span>
            <span class="text-xs font-bold font-[var(--font-mono)] text-[var(--color-ink-primary)]">{parsedAudit.stats.pageWeightKb || 0} KB</span>
          </div>

        </div>
      </div>
    {/if}

  </div>
{/if}
