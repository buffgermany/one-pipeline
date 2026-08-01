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
          const payload = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }

        const abortSignal = request.signal;

        try {
          const leads = await runScraperPipeline({
            queries,
            maxScrolls,
            enrichWebsites,
            industry: industry || 'API Scraping Job',
            headless: true,
            signal: abortSignal,
            onLog: (message) => {
              sendEvent('log', { message, timestamp: new Date().toLocaleTimeString() });
            },
            onLeadScraped: (lead) => {
              sendEvent('lead', { lead });
            },
            onProgress: (percent, statusText) => {
              sendEvent('progress', { percent, statusText });
            }
          });

          sendEvent('complete', {
            count: leads.length,
            leads,
            aborted: abortSignal.aborted
          });

          controller.close();
        } catch (err: any) {
          sendEvent('error', { error: err.message || 'Scraper error' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
