import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { enrichWebsite } from '$lib/server/scraper/enricher';
import { eq, inArray, isNull, or, and, isNotNull } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { leadIds, action = 'both' } = body; // action: 'enrich' | 'audit' | 'both'

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
        .limit(50);
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
        .limit(50);
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
        .limit(50);
    }

    if (targetLeads.length === 0) {
      return json({ message: 'Keine passenden Leads zum Anreichern oder Auditen gefunden.', updatedCount: 0 });
    }

    let updatedCount = 0;

    // Process target leads concurrently (batching)
    await Promise.all(
      targetLeads.map(async (lead) => {
        if (!lead.website || !lead.website.startsWith('http')) return;

        try {
          const enriched = await enrichWebsite(lead.website, lead.phoneNumber);

          const updateData: any = {};
          if (enriched.decisionMaker) updateData.decisionMaker = enriched.decisionMaker;
          if (enriched.email) updateData.email = enriched.email;
          if (enriched.directEmail) updateData.directEmail = enriched.directEmail;
          if (enriched.websitePhone) updateData.websitePhone = enriched.websitePhone;
          if (enriched.directPhone) updateData.directPhone = enriched.directPhone;
          if (enriched.techStack) updateData.techStack = enriched.techStack;
          if (enriched.facebook) updateData.facebook = enriched.facebook;
          if (enriched.instagram) updateData.instagram = enriched.instagram;
          if (enriched.linkedin) updateData.linkedin = enriched.linkedin;
          if (enriched.sources) updateData.enrichmentSources = JSON.stringify(enriched.sources);
          if (enriched.auditScore !== undefined) updateData.auditScore = enriched.auditScore;
          if (enriched.auditData !== undefined) updateData.auditData = enriched.auditData;

          if (Object.keys(updateData).length > 0) {
            await db
              .update(leads)
              .set(updateData)
              .where(eq(leads.id, lead.id));
            updatedCount++;
          }
        } catch (e) {
          console.error(`Failed to enrich/audit lead ${lead.id} (${lead.website}):`, e);
        }
      })
    );

    // Broadcast update to all clients
    fetch('http://localhost:3001/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'QUEUE_UPDATE', action: 'leads_enriched_audited' })
    }).catch(() => {});

    return json({
      success: true,
      message: `${updatedCount} Leads wurden erfolgreich analysiert und im System aktualisiert.`,
      updatedCount
    });
  } catch (err: any) {
    console.error('Enrich & Audit Error:', err);
    return json({ error: err.message || 'Server error' }, { status: 500 });
  }
};
