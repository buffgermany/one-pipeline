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
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-[var(--color-ink-primary)] font-[var(--font-excon)]">
              Website Health & Conversion Audit
            </h3>
            {#if score < 50}
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                High Potential Lead
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
            Automatische Analyse von Buchungssystemen, Mobil-Readiness, SEO & Sicherheit.
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

        <!-- Security -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <ShieldCheck size={13} class="text-[var(--color-accent-emerald)]" />
              Sicherheit
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.security}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.security)}" style="width: {parsedAudit.scores.security}%"></div>
          </div>
        </div>

        <!-- Conversion -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <Target size={13} class="text-[var(--color-accent-emerald)]" />
              Conversion
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.conversion}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.conversion)}" style="width: {parsedAudit.scores.conversion}%"></div>
          </div>
        </div>

        <!-- SEO -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <Search size={13} class="text-[var(--color-accent-emerald)]" />
              SEO
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.seo}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.seo)}" style="width: {parsedAudit.scores.seo}%"></div>
          </div>
        </div>

        <!-- Speed -->
        <div class="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-ink-secondary)] font-medium flex items-center gap-1.5">
              <Zap size={13} class="text-[var(--color-accent-emerald)]" />
              Speed
            </span>
            <span class="font-bold text-[var(--color-ink-primary)]">{parsedAudit.scores.performance}%</span>
          </div>
          <div class="w-full bg-[var(--color-surface-lift)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.performance)}" style="width: {parsedAudit.scores.performance}%"></div>
          </div>
        </div>

        <!-- Tech Stack -->
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

    <!-- COLD CALL TALKING POINTS / PITCH ARGUMENTS -->
    {#if parsedAudit.pitchPoints && parsedAudit.pitchPoints.length > 0}
      <div class="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] rounded-[var(--radius-md)] p-3.5 flex flex-col gap-2">
        <div class="flex items-center gap-2 text-xs font-bold text-[var(--color-status-amber)] font-[var(--font-excon)]">
          <PhoneCall size={14} class="shrink-0" />
          <span>Verkaufsargumente für das Telefonat</span>
        </div>
        <ul class="flex flex-col gap-1.5 pl-1">
          {#each parsedAudit.pitchPoints as pitch}
            <li class="text-xs text-[var(--color-ink-primary)] flex items-start gap-2 leading-relaxed">
              <span class="text-[var(--color-status-amber)] font-bold font-mono">•</span>
              <span>{pitch}</span>
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
          <span>Erkannte Schwachstellen ({parsedAudit.problems.length})</span>
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

    <!-- MEASURED INFRASTRUCTURE MATRIX -->
    {#if parsedAudit.stats}
      <div class="flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-4">
        <span class="text-xs font-bold text-[var(--color-ink-muted)] font-[var(--font-excon)]">
          Technische Infrastruktur & Kennzahlen
        </span>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">CMS / SYSTEM</span>
            <span class="font-bold text-[var(--color-ink-primary)] truncate" title={parsedAudit.stats.cmsName}>{parsedAudit.stats.cmsName || 'Eigenentwicklung'}</span>
          </div>

          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">HTTPS / SSL</span>
            <span class="font-bold flex items-center gap-1 {parsedAudit.stats.hasHttps ? 'text-[var(--color-accent-emerald)]' : 'text-[var(--color-status-rose)]'}">
              {#if parsedAudit.stats.hasHttps}
                <CheckCircle2 size={12} class="shrink-0" />
                <span>Aktiv</span>
              {:else}
                <XCircle size={12} class="shrink-0" />
                <span>Unverschlüsselt</span>
              {/if}
            </span>
          </div>

          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">TERMINBUCHUNG</span>
            <span class="font-bold flex items-center gap-1 {parsedAudit.stats.hasOnlineBooking ? 'text-[var(--color-accent-emerald)]' : 'text-[var(--color-status-amber)]'} truncate">
              {#if parsedAudit.stats.hasOnlineBooking}
                <CheckCircle2 size={12} class="shrink-0" />
                <span class="truncate">{parsedAudit.stats.bookingProvider || 'Vorhanden'}</span>
              {:else}
                <XCircle size={12} class="shrink-0" />
                <span>Keine Buchung</span>
              {/if}
            </span>
          </div>

          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">MOBIL-ANRUF (TEL:)</span>
            <span class="font-bold flex items-center gap-1 {parsedAudit.stats.hasTelLink ? 'text-[var(--color-accent-emerald)]' : 'text-[var(--color-status-rose)]'}">
              {#if parsedAudit.stats.hasTelLink}
                <CheckCircle2 size={12} class="shrink-0" />
                <span>Vorhanden</span>
              {:else}
                <XCircle size={12} class="shrink-0" />
                <span>Fehlt</span>
              {/if}
            </span>
          </div>

          <div class="p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-page-void)] border border-[var(--color-border-subtle)] flex flex-col gap-0.5">
            <span class="text-[10px] text-[var(--color-ink-muted)]">DSGVO BANNER</span>
            <span class="font-bold text-[var(--color-ink-primary)] truncate">
              {parsedAudit.stats.hasCookieBanner ? (parsedAudit.stats.cookieBannerProvider || 'Vorhanden') : 'Nicht erkannt'}
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
