import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { enrichWebsite } from '$lib/server/scraper/enricher';
import { eq, inArray, isNull, or, and, isNotNull } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { leadIds, action = 'both' } = body; // action: 'enrich' | 'audit' | 're-audit' | 'both'

    let targetLeads: any[] = [];

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      targetLeads = await db
        .select()
        .from(leads)
        .where(inArray(leads.id, leadIds));
    } else if (action === 'enrich') {
      // Find all leads with website that are not enriched yet (no decisionMaker, email, or techStack)
      targetLeads = await db
        .select()
        .from(leads)
        .where(
          and(
            isNotNull(leads.website),
            or(isNull(leads.decisionMaker), isNull(leads.email), isNull(leads.techStack))
          )
        )
        .limit(100);
    } else if (action === 'audit') {
      // Find all leads with website that don't have an auditScore yet
      targetLeads = await db
        .select()
        .from(leads)
        .where(
          and(
            isNotNull(leads.website),
            isNull(leads.auditScore)
          )
        )
        .limit(100);
    } else if (action === 're-audit') {
      // Find ALL leads with website to re-evaluate their audit score
      targetLeads = await db
        .select()
        .from(leads)
        .where(isNotNull(leads.website))
        .limit(100);
    } else {
      // Both: missing enrichment OR missing audit
      targetLeads = await db
        .select()
        .from(leads)
        .where(
          and(
            isNotNull(leads.website),
            or(isNull(leads.decisionMaker), isNull(leads.email), isNull(leads.auditScore))
          )
        )
        .limit(100);
    }

    if (targetLeads.length === 0) {
      return json({ message: 'Keine passenden Leads in der Queue gefunden.', updatedCount: 0, leads: [] });
    }

    // Return target leads list so frontend can process with real-time per-chunk progress!
    return json({
      success: true,
      totalCount: targetLeads.length,
      leadIds: targetLeads.map(l => l.id)
    });
  } catch (err: any) {
    console.error('Enrich & Audit Endpoint Error:', err);
    return json({ error: err.message || 'Server error' }, { status: 500 });
  }
};
