export class QueueState {
  leads = $state<any[]>([]);
  agentId = $state<string>('');

  constructor(agentId: string) {
    this.agentId = agentId;
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  connect() {
    const ws = new WebSocket(`ws://localhost:3001/ws?agentId=${this.agentId}`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'QUEUE_UPDATE') {
          this.fetchLeads();
        }
      } catch (e) {}
    };
    ws.onopen = () => {
      console.log('WS connected');
      this.fetchLeads();
    };
    ws.onclose = () => {
      console.log('WS disconnected, reconnecting in 2s...');
      setTimeout(() => this.connect(), 2000);
    };
  }

  async fetchLeads() {
    const res = await fetch('/api/queue/status');
    if (res.ok) {
      this.leads = await res.json();
    }
  }

  async pullNext() {
    const res = await fetch('/api/queue/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: this.agentId })
    });
    if (res.ok) {
      const { lead } = await res.json();
      return lead;
    }
    return null;
  }
}
