import { runScraperPipeline } from '$lib/server/scraper/pipeline';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { queries, maxScrolls = 5, enrichWebsites = true, industry } = body;

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required array field: "queries"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set up Server-Sent Events (SSE) Stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(type: string, data: any) {
          try {
            const payload = `data: ${JSON.stringify({ type, ...data })}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch {
            // Controller closed
          }
        }

        // Server Pipeline Controller: Decoupled from transient HTTP proxy signal fluctuations
        const pipelineController = new AbortController();

        // Send Keep-Alive Ping every 5 seconds to prevent Traefik/Caddy/Nginx idle timeouts on Coolify
        const heartbeatInterval = setInterval(() => {
          sendEvent('ping', { timestamp: Date.now() });
        }, 5000);

        // Optional: Listen for explicit client abort if client drops
        request.signal.addEventListener('abort', () => {
          // Send log before closing
          console.log('ℹ️ [Server SSE] Client HTTP connection ended/disconnected.');
        });

        try {
          const leads = await runScraperPipeline({
            queries,
            maxScrolls,
            enrichWebsites,
            industry: industry || 'API Scraping Job',
            headless: true,
            signal: pipelineController.signal,
            onLog: (message) => {
              sendEvent('log', { message, timestamp: new Date().toLocaleTimeString() });
            },
            onLeadScraped: (lead) => {
              sendEvent('lead', { lead });
            },
            onEnrichedLead: (lead) => {
              sendEvent('enriched_lead', { lead });
            },
            onProgress: (percent, statusText) => {
              sendEvent('progress', { percent, statusText });
            }
          });

          clearInterval(heartbeatInterval);

          sendEvent('complete', {
            count: leads.length,
            leads,
            aborted: pipelineController.signal.aborted
          });

          controller.close();
        } catch (err: any) {
          clearInterval(heartbeatInterval);
          sendEvent('error', { error: err.message || 'Scraper error' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
