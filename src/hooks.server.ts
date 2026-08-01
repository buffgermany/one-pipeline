import { redirect, json, type Handle, type HandleServerError } from '@sveltejs/kit';
import { validateSessionToken } from '$lib/server/auth';

// Common public internet bot scanner probe paths (Shodan/Censys vulnerability bots)
const BOT_PROBE_REGEX = /\.(env|git|py|bak|save|old|php|asp|jsp|txt)|(bundle|chunk|vendor)\.js|(\.\.%2F)/i;

// Unprotected public routes that do not require login
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/profiles',
  '/api/auth/logout'
];

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;

  // Intercept bot vulnerability scanners quietly without console spam
  if (BOT_PROBE_REGEX.test(pathname)) {
    return new Response('Not Found', { status: 404 });
  }

  // 1. Session Token Authentication
  const sessionToken = event.cookies.get('buff_session');
  let user = null;

  if (sessionToken) {
    user = await validateSessionToken(sessionToken);
  }

  event.locals.user = user;

  // 2. Authentication Guard
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith('/api/auth/'));
  
  if (!user && !isPublicPath) {
    if (pathname.startsWith('/api/')) {
      return json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }
    throw redirect(303, '/login');
  }

  // Redirect logged-in users away from /login to dashboard
  if (user && pathname === '/login') {
    throw redirect(303, '/');
  }

  // 3. Resolve request and apply security headers
  const response = await resolve(event);

  // Security & Pentesting HTTP Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
  const pathname = event.url.pathname;

  // Suppress 404 error logging for bot scanner probes
  if (BOT_PROBE_REGEX.test(pathname)) {
    return;
  }

  console.error(`[Server Error] at ${pathname}:`, error);
};
