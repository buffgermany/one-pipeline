import type { Handle, HandleServerError } from '@sveltejs/kit';

// Common public internet bot scanner probe paths (Shodan/Censys vulnerability bots)
const BOT_PROBE_REGEX = /\.(env|git|py|bak|save|old|php|asp|jsp|txt)|(bundle|chunk|vendor)\.js|(\.\.%2F)/i;

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;

  // Intercept bot vulnerability scanners quietly without console spam
  if (BOT_PROBE_REGEX.test(pathname)) {
    return new Response('Not Found', { status: 404 });
  }

  return resolve(event);
};

export const handleError: HandleServerError = ({ error, event }) => {
  const pathname = event.url.pathname;

  // Suppress 404 error logging for bot scanner probes
  if (BOT_PROBE_REGEX.test(pathname)) {
    return;
  }

  console.error(`[Server Error] at ${pathname}:`, error);
};
