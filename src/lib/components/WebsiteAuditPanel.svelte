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
  import Sparkles from 'lucide-svelte/icons/sparkles';
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

  function getScoreColor(val: number) {
    if (val >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (val >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  }

  function getBarColorClass(val: number) {
    if (val >= 80) return 'bg-emerald-500';
    if (val >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  }
</script>

{#if !parsedAudit}
  <div class="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 text-xs text-neutral-400 flex items-center justify-between gap-3">
    <div class="flex items-center gap-2">
      <AlertTriangle size={16} class="text-neutral-500" />
      <span>Kein Website-Audit verfügbar (noch nicht gescrapt oder keine Website vorhanden).</span>
    </div>
  </div>
{:else}
  <div class="bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-5 md:p-6 flex flex-col gap-6 backdrop-blur-xl shadow-xl">
    
    <!-- TOP HEADER WITH SCORE GAUGE & OVERVIEW -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-4">
      <div class="flex items-center gap-3">
        <div class="w-14 h-14 rounded-2xl border flex flex-col items-center justify-center font-[var(--font-excon)] font-extrabold shadow-lg shrink-0 {getScoreColor(score)}">
          <span class="text-xl leading-none">{score}</span>
          <span class="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">/ 100</span>
        </div>
        <div>
          <h3 class="text-sm font-[var(--font-excon)] font-bold text-white tracking-tight flex items-center gap-2">
            <span>Website Health & Conversion Audit</span>
            {#if score < 50}
              <span class="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold">
                🔥 High Potential Lead
              </span>
            {:else if score < 80}
              <span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                ⚠️ Ausbaufähig
              </span>
            {:else}
              <span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                ✓ Gut optimiert
              </span>
            {/if}
          </h3>
          <p class="text-[11px] text-neutral-400 mt-0.5">
            Automatische Deep-Analyse von Buchungssystemen, Technik, SEO & Mobile-Readiness.
          </p>
        </div>
      </div>
    </div>

    <!-- 6 SUB-CATEGORY SCORE BARS -->
    {#if parsedAudit.scores}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        
        <!-- Mobile & UX -->
        <div class="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-neutral-400 font-semibold flex items-center gap-1">
              <Smartphone size={12} class="text-emerald-400" /> Mobil & UX
            </span>
            <span class="font-mono font-bold text-white">{parsedAudit.scores.mobileUX}%</span>
          </div>
          <div class="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.mobileUX)}" style="width: {parsedAudit.scores.mobileUX}%"></div>
          </div>
        </div>

        <!-- Security & HTTPS -->
        <div class="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-neutral-400 font-semibold flex items-center gap-1">
              <ShieldCheck size={12} class="text-emerald-400" /> Sicherheit
            </span>
            <span class="font-mono font-bold text-white">{parsedAudit.scores.security}%</span>
          </div>
          <div class="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.security)}" style="width: {parsedAudit.scores.security}%"></div>
          </div>
        </div>

        <!-- Conversion & Lead-Gen -->
        <div class="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-neutral-400 font-semibold flex items-center gap-1">
              <Target size={12} class="text-emerald-400" /> Conversion
            </span>
            <span class="font-mono font-bold text-white">{parsedAudit.scores.conversion}%</span>
          </div>
          <div class="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.conversion)}" style="width: {parsedAudit.scores.conversion}%"></div>
          </div>
        </div>

        <!-- SEO -->
        <div class="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-neutral-400 font-semibold flex items-center gap-1">
              <Search size={12} class="text-emerald-400" /> SEO
            </span>
            <span class="font-mono font-bold text-white">{parsedAudit.scores.seo}%</span>
          </div>
          <div class="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.seo)}" style="width: {parsedAudit.scores.seo}%"></div>
          </div>
        </div>

        <!-- Performance -->
        <div class="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-neutral-400 font-semibold flex items-center gap-1">
              <Zap size={12} class="text-emerald-400" /> Speed
            </span>
            <span class="font-mono font-bold text-white">{parsedAudit.scores.performance}%</span>
          </div>
          <div class="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.performance)}" style="width: {parsedAudit.scores.performance}%"></div>
          </div>
        </div>

        <!-- Tech Modernity -->
        <div class="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-neutral-400 font-semibold flex items-center gap-1">
              <Code size={12} class="text-emerald-400" /> Tech Stack
            </span>
            <span class="font-mono font-bold text-white">{parsedAudit.scores.techModernity}%</span>
          </div>
          <div class="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full {getBarColorClass(parsedAudit.scores.techModernity)}" style="width: {parsedAudit.scores.techModernity}%"></div>
          </div>
        </div>

      </div>
    {/if}

    <!-- COLD CALL TALKING POINTS / PITCH ARGUMENTS -->
    {#if parsedAudit.pitchPoints && parsedAudit.pitchPoints.length > 0}
      <div class="bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-2">
        <span class="text-xs font-[var(--font-excon)] font-bold text-amber-200 flex items-center gap-2">
          <PhoneCall size={14} class="text-amber-400" />
          Perfekte Verkaufsargumente für das Telefonat:
        </span>
        <ul class="flex flex-col gap-1.5">
          {#each parsedAudit.pitchPoints as pitch}
            <li class="text-[11px] text-neutral-300 flex items-start gap-2">
              <span class="text-amber-400 font-bold">•</span>
              <span>{pitch}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- EXACT PROBLEMS & DEFICITS -->
    {#if parsedAudit.problems && parsedAudit.problems.length > 0}
      <div class="flex flex-col gap-2">
        <span class="text-xs font-[var(--font-excon)] font-bold text-rose-300 flex items-center gap-1.5">
          <ShieldAlert size={14} class="text-rose-400" />
          Konkrete Mängel & Probleme ({parsedAudit.problems.length}):
        </span>
        <div class="grid grid-cols-1 gap-1.5">
          {#each parsedAudit.problems as problem}
            <div class="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] font-mono text-rose-200 flex items-center gap-2">
              <AlertTriangle size={13} class="text-rose-400 shrink-0" />
              <span>{problem}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- STATS GRID -->
    {#if parsedAudit.stats}
      <div class="flex flex-col gap-2 border-t border-neutral-800/80 pt-4">
        <span class="text-[11px] font-[var(--font-excon)] font-bold text-neutral-400 uppercase tracking-wider">
          Gemessene Kennzahlen & Feature-Matrix:
        </span>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
          <div class="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-300">
            <span class="text-neutral-500 block text-[9px]">CMS / SYSTEM</span>
            <span class="font-bold text-white truncate block" title={parsedAudit.stats.cmsName}>{parsedAudit.stats.cmsName || 'Custom'}</span>
          </div>

          <div class="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-300">
            <span class="text-neutral-500 block text-[9px]">HTTPS / SSL CERT</span>
            <span class="font-bold {parsedAudit.stats.hasHttps ? 'text-emerald-400' : 'text-rose-400'}">
              {parsedAudit.stats.hasHttps ? '✓ Aktiv (HTTPS)' : '❌ Fehlt (HTTP)'}
            </span>
          </div>

          <div class="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-300">
            <span class="text-neutral-500 block text-[9px]">TERMINBUCHUNG</span>
            <span class="font-bold {parsedAudit.stats.hasOnlineBooking ? 'text-emerald-400' : 'text-amber-400'} truncate block" title={parsedAudit.stats.bookingProvider}>
              {parsedAudit.stats.hasOnlineBooking ? `✓ ${parsedAudit.stats.bookingProvider}` : '❌ Keine Buchung'}
            </span>
          </div>

          <div class="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-300">
            <span class="text-neutral-500 block text-[9px]">MOBIL-ANRUF (TEL:)</span>
            <span class="font-bold {parsedAudit.stats.hasTelLink ? 'text-emerald-400' : 'text-rose-400'}">
              {parsedAudit.stats.hasTelLink ? '✓ Vorhanden' : '❌ Fehlt'}
            </span>
          </div>

          <div class="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-300">
            <span class="text-neutral-500 block text-[9px]">DSGVO BANNER</span>
            <span class="font-bold {parsedAudit.stats.hasCookieBanner ? 'text-emerald-400' : 'text-neutral-400'}">
              {parsedAudit.stats.hasCookieBanner ? `✓ ${parsedAudit.stats.cookieBannerProvider}` : 'Nicht erkannt'}
            </span>
          </div>

          <div class="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-300">
            <span class="text-neutral-500 block text-[9px]">SEITENGRÖSSE & SPEED</span>
            <span class="font-bold text-white">{parsedAudit.stats.pageWeightKb} KB</span>
          </div>
        </div>
      </div>
    {/if}

  </div>
{/if}
