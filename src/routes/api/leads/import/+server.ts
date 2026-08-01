import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';

export async function POST({ request }) {
  const { importedLeads, filename } = await request.json();
  
  if (!Array.isArray(importedLeads) || importedLeads.length === 0) {
    return json({ error: 'No leads provided' }, { status: 400 });
  }

  try {
    const values = importedLeads.map(lead => ({
      id: crypto.randomUUID(),
      name: String(lead.name),
      phoneNumber: String(lead.phoneNumber),
      websitePhone: lead.websitePhone ? String(lead.websitePhone) : null,
      directPhone: lead.directPhone ? String(lead.directPhone) : null,
      decisionMaker: lead.decisionMaker ? String(lead.decisionMaker) : null,
      techStack: lead.techStack ? String(lead.techStack) : null,
      industry: String(lead.industry || 'Allgemein'),
      status: 'new',
      notes: lead.notes ? String(lead.notes) : null,
      importFilename: filename ? String(filename) : null,
      website: lead.website ? String(lead.website) : null,
      email: lead.email ? String(lead.email) : null,
      directEmail: lead.directEmail ? String(lead.directEmail) : null,
      facebook: lead.facebook ? String(lead.facebook) : null,
      instagram: lead.instagram ? String(lead.instagram) : null,
      linkedin: lead.linkedin ? String(lead.linkedin) : null,
      placeId: lead.placeId ? String(lead.placeId) : null,
      featuredImage: lead.featuredImage ? String(lead.featuredImage) : null,
      rating: lead.rating ? String(lead.rating) : null,
      reviews: lead.reviews ? Number(lead.reviews) : null,
      address: lead.address ? String(lead.address) : null,
      category: lead.category ? String(lead.category) : null,
      enrichmentSources: lead.sources ? JSON.stringify(lead.sources) : (lead.enrichmentSources ? String(lead.enrichmentSources) : null),
      openStatus: lead.openStatus ? String(lead.openStatus) : null,
      priceLevel: lead.priceLevel ? String(lead.priceLevel) : null,
      googleMapsUrl: lead.googleMapsUrl ? String(lead.googleMapsUrl) : null,
      isAd: lead.isAd ?? false,
      isClaimed: lead.isClaimed ?? true,
      auditScore: lead.auditScore ? Number(lead.auditScore) : (lead.auditResult?.overallScore ? Number(lead.auditResult.overallScore) : null),
      auditData: lead.auditData ? (typeof lead.auditData === 'string' ? lead.auditData : JSON.stringify(lead.auditData)) : (lead.auditResult ? JSON.stringify(lead.auditResult) : null)
    }));

    await db.insert(leads).values(values);

    // Broadcast update
    fetch('http://localhost:3001/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'QUEUE_UPDATE', action: 'leads_imported' })
    }).catch(err => console.error('WS Broadcast failed:', err));

    return json({ success: true, count: values.length });
  } catch (err) {
    console.error('Import error:', err);
    return json({ error: 'Failed to import leads' }, { status: 500 });
  }
}
