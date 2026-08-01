import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { enrichWebsite } from '$lib/server/scraper/enricher';
import { eq, inArray } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { leadIds } = await request.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return json({ error: 'leadIds array is required' }, { status: 400 });
    }

    const targetLeads = await db
      .select()
      .from(leads)
      .where(inArray(leads.id, leadIds));

    let updatedCount = 0;

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
          console.error(`Failed to process lead ${lead.id} (${lead.website}):`, e);
        }
      })
    );

    return json({ success: true, processedCount: targetLeads.length, updatedCount });
  } catch (err: any) {
    console.error('Process Chunk Error:', err);
    return json({ error: err.message || 'Server error' }, { status: 500 });
  }
};
