<script lang="ts">
  import { page } from '$app/stores';
  import Box from 'lucide-svelte/icons/box';
  import Search from 'lucide-svelte/icons/search';
</script>

<nav class="flex items-center justify-between px-[var(--spacing-24)] py-4 border-b border-[var(--color-ash-step)] bg-[var(--color-page-void)] relative z-50">
  <div class="flex items-center gap-3">
    <!-- Logo -->
    <div class="text-[var(--color-purple-text)] bg-[var(--color-purple-subtle)] p-1.5 rounded-lg border border-[var(--color-purple-accent)]/50 shadow-[0_0_15px_rgba(126,34,206,0.3)]">
      <Box size={20} strokeWidth={2.5} />
    </div>
    <div class="flex flex-col">
      <span class="text-lg font-[var(--font-general-sans)] font-black text-[var(--color-off-white-ink)] leading-none tracking-tight">BUFF</span>
      <span class="text-[9px] text-[var(--color-purple-accent)] font-bold tracking-[0.2em] leading-none mt-0.5">OBJECTIONS</span>
    </div>
  </div>
  
  <div class="absolute left-1/2 -translate-x-1/2">
    <div class="flex items-center gap-2 border border-[var(--color-spray-wash)]/30 bg-[var(--color-spray-wash)]/10 px-4 py-1.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.1)]">
      <div class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-spray-wash)] opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-spray-wash)]"></span>
      </div>
      <span class="text-[var(--color-spray-wash)] text-[10px] font-bold tracking-widest uppercase">Live Co-Pilot Active</span>
    </div>
  </div>
  
  <div class="flex items-center">
    <div class="relative group">
      <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-sand-label)] group-focus-within:text-white transition-colors" />
      <input 
        type="text" 
        placeholder="Einwand tippen..." 
        class="bg-[var(--color-graphite-card)] border border-[var(--color-ash-step)] rounded-lg pl-9 pr-12 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors w-72 shadow-inner" 
      />
      <div class="absolute right-2 top-1/2 -translate-y-1/2 border border-[var(--color-ash-step)] rounded bg-[var(--color-slate-matte)] px-1.5 py-0.5 text-[10px] text-[var(--color-sand-label)] font-mono font-medium">⌘K</div>
    </div>
  </div>
</nav>
