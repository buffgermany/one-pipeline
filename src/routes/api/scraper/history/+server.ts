import { db } from '$lib/server/db';
import { searchHistory, leads } from '$lib/server/db/schema';
import type { RequestHandler } from '@sveltejs/kit';
import { desc, like, and, or, sql } from 'drizzle-orm';

const GERMAN_STOP_WORDS = new Set(['in', 'im', 'bei', 'nach', 'aus', 'von', 'der', 'die', 'das', 'und', '&', 'fuer', 'für', 'um', 'notdienst']);

function normalizeSearchTokens(query: string): string[] {
  if (!query) return [];
  return query
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !GERMAN_STOP_WORDS.has(w))
    .map(w => {
      // Basic German plural / suffix stemmer
      if (w.endsWith('en') && w.length > 5) return w.slice(0, -2);
      if (w.endsWith('s') && w.length > 4) return w.slice(0, -1);
      if (w.endsWith('e') && w.length > 4) return w.slice(0, -1);
      return w;
    });
}

// Check if two query token sets match semantically
function areQueriesMatching(tokensA: string[], tokensB: string[]): boolean {
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  
  // Check token intersection
  const setB = new Set(tokensB);
  const matchCount = tokensA.filter(t => setB.has(t) || tokensB.some(b => b.includes(t) || t.includes(b))).length;
  
  const minRequired = Math.min(tokensA.length, tokensB.length);
  return matchCount >= minRequired;
}

// GET /api/scraper/history - Fetch past search history + smart semantic duplicate query check
export const GET: RequestHandler = async ({ url }) => {
  try {
    const q = url.searchParams.get('query');

    const history = await db
      .select()
      .from(searchHistory)
      .orderBy(desc(searchHistory.createdAt))
      .limit(100);

    let previousMatch = null;
    let existingLeadsCount = 0;

    if (q && q.trim()) {
      const targetTokens = normalizeSearchTokens(q);

      if (targetTokens.length > 0) {
        // 1. Smart Semantic Search in Search History
        previousMatch = history.find(h => {
          const histTokens = normalizeSearchTokens(h.query);
          return areQueriesMatching(targetTokens, histTokens);
        }) || null;

        // 2. Smart Lead Count in SQLite Database for matching Category + City
        // E.g. targetTokens = ['restaurant', 'leipzig']
        const whereConditions = targetTokens.map(token => or(
          like(leads.name, `%${token}%`),
          like(leads.address, `%${token}%`),
          like(leads.industry, `%${token}%`),
          like(leads.category, `%${token}%`)
        ));

        if (whereConditions.length > 0) {
          const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(leads)
            .where(and(...whereConditions));

          existingLeadsCount = Number(countResult[0]?.count || 0);
        }
      }
    }

    return new Response(JSON.stringify({ history, previousMatch, existingLeadsCount }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// POST /api/scraper/history - Save a new search run to history
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { query, industry, city, leadsFound, enrichedCount } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.insert(searchHistory).values({
      id,
      query,
      industry: industry || 'Allgemein',
      city: city || null,
      leadsFound: leadsFound || 0,
      enrichedCount: enrichedCount || 0
    });

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
