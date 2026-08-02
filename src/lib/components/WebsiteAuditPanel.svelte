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

  function getScoreBadgeClass(val: number) {
    if (val >= 80) return 'text-[var(--color-accent-emerald)] border-[var(--color-emerald-border)] bg-[var(--color-emerald-tint)]';
    if (val >= 50) return 'text-[var(--color-status-amber)] border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)]';
    return 'text-[var(--color-status-rose)] border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.12)]';
  }

  function getBarColorClass(val: number) {
    if (val >= 80) return 'bg-[var(--color-accent-emerald)]';
    if (val >= 50) return 'bg-[var(--color-status-amber)]';
    return 'bg-[var(--color-status-rose)]';
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
                🔥 Redesign & WaaS Potential
              </span>
            {:else if score < 80}
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                ⚡ Ausbaufähig
              </span>
            {:else}
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ✅ Gut optimiert
              </span>
            {/if}
          </div>
          <p class="text-xs text-[var(--color-ink-muted)]">
            Tiefen-Audit: Formular & Kalender, Custom Cookie Banner, DSGVO, Schema.org SEO & WaaS-Potenzial.
          </p>
        </div>
      </div>
    </div>

    <!-- 6 SUB-CATEGORY SCORE BARS -->
    {#if parsedAudit.scores}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        
        <!-- Mobile & UX -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <Smartphone size={13} class="text-[var(--color-accent-emerald)]" />
              Mobil & UX
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.mobileUX}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.mobileUX)}" style="width: {parsedAudit.scores.mobileUX}%"></div>
          </div>
        </div>

        <!-- Security & DSGVO -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <ShieldCheck size={13} class="text-[var(--color-accent-emerald)]" />
              DSGVO & Recht
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.securityDSGVO ?? parsedAudit.scores.security ?? 0}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.securityDSGVO ?? parsedAudit.scores.security ?? 0)}" style="width: {parsedAudit.scores.securityDSGVO ?? parsedAudit.scores.security ?? 0}%"></div>
          </div>
        </div>

        <!-- Conversion & Leads -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <Target size={13} class="text-[var(--color-accent-emerald)]" />
              Conversion & Funnel
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.conversionLeads ?? parsedAudit.scores.conversion ?? 0}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.conversionLeads ?? parsedAudit.scores.conversion ?? 0)}" style="width: {parsedAudit.scores.conversionLeads ?? parsedAudit.scores.conversion ?? 0}%"></div>
          </div>
        </div>

        <!-- Local SEO -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <Search size={13} class="text-[var(--color-accent-emerald)]" />
              Local SEO & SERP
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.localSEO ?? parsedAudit.scores.seo ?? 0}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.localSEO ?? parsedAudit.scores.seo ?? 0)}" style="width: {parsedAudit.scores.localSEO ?? parsedAudit.scores.seo ?? 0}%"></div>
          </div>
        </div>

        <!-- Speed & Code -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <Zap size={13} class="text-[var(--color-accent-emerald)]" />
              Speed & Assets
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.performance}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.performance)}" style="width: {parsedAudit.scores.performance}%"></div>
          </div>
        </div>

        <!-- Tech Modernity -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <Code size={13} class="text-[var(--color-accent-emerald)]" />
              Tech Stack
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.techModernity}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.techModernity)}" style="width: {parsedAudit.scores.techModernity}%"></div>
          </div>
        </div>

      </div>
    {/if}

    <!-- COLD CALL TALKING POINTS / PITCH ARGUMENTS (WaaS & REDESIGN) -->
    {#if parsedAudit.pitchPoints && parsedAudit.pitchPoints.length > 0}
      <div class="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] rounded-[var(--radius-md)] p-3.5 flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-bold text-[var(--color-status-amber)] font-[var(--font-excon)]">
            <PhoneCall size={14} class="shrink-0" />
            <span>Verkaufsargumente für Website-Relaunch & WaaS Flatrate</span>
          </div>
          <span class="text-[10px] text-[var(--color-ink-muted)] font-mono">
            {parsedAudit.pitchPoints.length} Sätze
          </span>
        </div>

        <ul class="flex flex-col gap-2">
          {#each parsedAudit.pitchPoints as pitch, idx}
            <li class="text-xs text-[var(--color-ink-primary)] bg-[var(--color-surface-panel)] border border-[rgba(245,158,11,0.18)] p-2.5 rounded-[var(--radius-sm)] flex items-start justify-between gap-3 leading-relaxed group">
              <div class="flex items-start gap-2">
                <span class="text-[var(--color-status-amber)] font-bold font-mono text-sm leading-none mt-0.5">•</span>
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
      </div>
    {/if}

    <!-- CONCRETE PROBLEMS & DEFICITS -->
    {#if parsedAudit.problems && parsedAudit.problems.length > 0}
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 text-xs font-bold text-[var(--color-status-rose)] font-[var(--font-excon)]">
          <ShieldAlert size={14} class="shrink-0" />
          <span>Erkannte Schwachstellen & Relaunch-Potenziale ({parsedAudit.problems.length})</span>
        </div>
        <div class="flex flex-col gap-1.5">
          {#each parsedAudit.problems as problem}
            <div class="p-2.5 rounded-[var(--radius-sm)] bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.2)] text-xs text-[var(--color-status-rose)] flex items-start gap-2">
              <AlertTriangle size={14} class="shrink-0 mt-0.5" />
              <span class="leading-normal">{problem}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- POSITIVE HIGHLIGHTS -->
    {#if parsedAudit.positiveHighlights && parsedAudit.positiveHighlights.length > 0}
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 text-xs font-bold text-[var(--color-accent-emerald)] font-[var(--font-excon)]">
          <CheckCircle2 size={14} class="shrink-0" />
          <span>Bestehende Stärken der Website ({parsedAudit.positiveHighlights.length})</span>
        </div>
        <div class="flex flex-col gap-1">
          {#each parsedAudit.positiveHighlights as highlight}
            <div class="text-xs text-[var(--color-ink-secondary)] flex items-center gap-2">
              <CheckCircle2 size={12} class="text-[var(--color-accent-emerald)] shrink-0" />
              <span>{highlight}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- MEASURED INFRASTRUCTURE MATRIX -->
    {#if parsedAudit.stats}
      {@const bookingBadge = getBookingBadge(parsedAudit.stats)}
      <div class="flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-4">
        <span class="text-xs font-bold text-[var(--color-ink-muted)] font-[var(--font-excon)]">
          Technische Infrastruktur & WaaS-Kennzahlen
        </span>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          
          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">CMS / SYSTEM</span>
            <span class="font-bold text-[var(--color-ink-primary)] truncate" title={parsedAudit.stats.cmsName}>{parsedAudit.stats.cmsName || 'Eigenentwicklung'}</span>
          </div>

          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">COPYRIGHT-STAND</span>
            <span class="font-bold flex items-center gap-1 {parsedAudit.stats.isCopyrightOutdated ? 'text-rose-400' : 'text-[var(--color-accent-emerald)]'}">
              <Clock size={12} class="shrink-0" />
              <span>{parsedAudit.stats.copyrightYear ? `© ${parsedAudit.stats.copyrightYear}` : 'Nicht angegeben'}</span>
            </span>
          </div>

          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">KONTAKT & BUCHUNG</span>
            <span class="font-bold flex items-center gap-1 truncate px-1.5 py-0.5 rounded text-[11px] border {bookingBadge.colorClass}">
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

          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">DSGVO BANNER & FONTS</span>
            <span class="font-bold flex items-center gap-1 truncate text-[11px] {parsedAudit.stats.hasGoogleFontsExternal && !parsedAudit.stats.hasCookieBanner ? 'text-amber-400' : 'text-[var(--color-ink-primary)]'}">
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

          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">LOCAL SEO (SCHEMA.ORG)</span>
            <span class="font-bold flex items-center gap-1 {parsedAudit.stats.hasSchemaOrg ? 'text-[var(--color-accent-emerald)]' : 'text-amber-400'}">
              <MapPin size={12} class="shrink-0" />
              <span>{parsedAudit.stats.hasSchemaOrg ? 'Schema.org aktiv' : 'Fehlt'}</span>
            </span>
          </div>

          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">SEITENGRÖSSE</span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.stats.pageWeightKb || 0} KB</span>
          </div>

        </div>
      </div>
    {/if}

  </div>
{/if}
