import { db } from '$lib/server/db';
import { searchHistory, leads } from '$lib/server/db/schema';
import type { RequestHandler } from '@sveltejs/kit';
import { desc, like, or, sql } from 'drizzle-orm';

// GET /api/scraper/history - Fetch past search history + check if query/city was already searched
export const GET: RequestHandler = async ({ url }) => {
  try {
    const q = url.searchParams.get('query');

    const history = await db
      .select()
      .from(searchHistory)
      .orderBy(desc(searchHistory.createdAt))
      .limit(50);

    // If checking a specific query/city
    let previousMatch = null;
    let existingLeadsCount = 0;

    if (q && q.trim()) {
      const cleanQ = q.trim().toLowerCase();
      
      const match = history.find(h => h.query.toLowerCase() === cleanQ || cleanQ.includes(h.query.toLowerCase()));
      if (match) {
        previousMatch = match;
      }

      // Check how many leads in DB match this query or city
      const words = cleanQ.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 0) {
        const conditions = words.map(w => or(
          like(leads.name, `%${w}%`),
          like(leads.address, `%${w}%`),
          like(leads.industry, `%${w}%`),
          like(leads.category, `%${w}%`)
        ));

        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(sql`(${sql.raw(conditions.map(() => '1').join(' OR '))})`);

        existingLeadsCount = Number(countResult[0]?.count || 0);
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
