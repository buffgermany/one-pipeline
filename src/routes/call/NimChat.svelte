<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import SendHorizontal from 'lucide-svelte/icons/send-horizontal';

  let { leadContext } = $props<{ leadContext: any }>();
  
  let messages = $state<any[]>([]);
  let input = $state('');
  let loading = $state(false);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    
    messages = [...messages, { role: 'user', content: input }];
    input = '';
    loading = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, leadContext })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          messages = [...messages, data.message];
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }
</script>

<Card class="flex flex-col h-full bg-transparent border-none shadow-none p-0">
  <div class="p-4 border-b border-[var(--color-ash-step)]/30">
    <h2 class="text-[var(--text-subheading)] font-[var(--font-general-sans)] font-bold text-[var(--color-off-white-ink)]">AI Co-Pilot</h2>
  </div>
  
  <div class="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
    {#each messages as msg}
      <div class="p-4 rounded-[var(--radius-xl)] max-w-[85%] {msg.role === 'user' ? 'bg-[var(--color-spray-wash)]/20 text-[var(--color-off-white-ink)] self-end' : 'bg-[var(--color-slate-matte)]/50 text-[var(--color-off-white-ink)] self-start'}">
        <p class="text-[var(--text-body-sm)]">{msg.content}</p>
      </div>
    {/each}
    {#if loading}
      <div class="p-4 rounded-[var(--radius-xl)] bg-[var(--color-slate-matte)]/50 self-start">
        <p class="text-[var(--text-body-sm)] text-[var(--color-sand-label)] animate-pulse">Thinking...</p>
      </div>
    {/if}
    {#if messages.length === 0}
      <div class="h-full flex flex-col items-center justify-center text-[var(--color-sand-label)] text-[var(--text-body-sm)] italic gap-2 opacity-50">
        <p>Ask for advice or objection handling.</p>
      </div>
    {/if}
  </div>

  <div class="p-4 border-t border-[var(--color-ash-step)]/30">
    <form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="flex gap-3">
      <input 
        type="text" 
        bind:value={input} 
        placeholder="Type your question..." 
        class="flex-1 bg-[var(--color-slate-matte)]/30 text-[var(--color-off-white-ink)] p-3 px-5 rounded-full border border-[var(--color-ash-step)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-spray-wash)]/50 transition-all"
      />
      <Button type="submit" disabled={loading || !input.trim()} class="rounded-full !px-4 !py-3 bg-[var(--color-spray-wash)] text-black font-bold shadow-sm">
        <SendHorizontal size={18} />
      </Button>
    </form>
  </div>
</Card>
