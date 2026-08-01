import { serve } from 'bun';

const server = serve<{ agentId: string }>({
  port: 3001,
  fetch(req, server) {
    const url = new URL(req.url);

    // 1. WebSocket Upgrade Endpoint (For the Frontend)
    if (url.pathname === '/ws') {
      const agentId = url.searchParams.get('agentId') || 'unknown';
      if (server.upgrade(req, { data: { agentId } })) {
        return; // successfully upgraded
      }
      return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    // 2. Internal Broadcast Endpoint (For the SvelteKit backend)
    if (url.pathname === '/broadcast' && req.method === 'POST') {
      return req.json().then(data => {
        server.publish('queue-updates', JSON.stringify(data));
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }).catch(err => {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      });
    }

    return new Response('Not Found', { status: 404 });
  },
  websocket: {
    open(ws) {
      console.log(`Agent ${ws.data.agentId} connected to queue updates`);
      ws.subscribe('queue-updates');
    },
    message(ws, message) {
      // Currently, we don't expect messages from the client
    },
    close(ws, code, reason) {
      console.log(`Agent ${ws.data.agentId} disconnected`);
    }
  }
});

console.log(`Bun WebSocket & Broadcast Server running at http://localhost:${server.port}`);
