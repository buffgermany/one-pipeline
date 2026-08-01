import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { eq, like, or, and, desc, asc, sql, isNotNull, ne } from 'drizzle-orm';

export async function GET({ url }) {
  try {
    const q = url.searchParams.get('q') || '';
    const industry = url.searchParams.get('industry') || '';
    const status = url.searchParams.get('status') || '';
    const sort = url.searchParams.get('sort') || 'created_at';
    const order = url.searchParams.get('order') || 'desc';

    let conditions = [];

    if (q) {
      conditions.push(
        or(
          like(leads.name, `%${q}%`),
          like(leads.industry, `%${q}%`),
          like(leads.category, `%${q}%`),
          like(leads.address, `%${q}%`),
          like(leads.phoneNumber, `%${q}%`),
          like(leads.decisionMaker, `%${q}%`),
          like(leads.techStack, `%${q}%`),
          like(leads.directEmail, `%${q}%`),
          like(leads.directPhone, `%${q}%`)
        )
      );
    }

    if (industry && industry !== 'all') {
      conditions.push(eq(leads.industry, industry));
    }

    if (status && status !== 'all') {
      conditions.push(eq(leads.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByClause;
    if (sort === 'name') {
      orderByClause = order === 'asc' ? asc(leads.name) : desc(leads.name);
    } else if (sort === 'rating') {
      orderByClause = order === 'asc' ? asc(leads.rating) : desc(leads.rating);
    } else if (sort === 'reviews') {
      orderByClause = order === 'asc' ? asc(leads.reviews) : desc(leads.reviews);
    } else if (sort === 'reschedule_at') {
      orderByClause = order === 'asc' ? asc(leads.rescheduleAt) : desc(leads.rescheduleAt);
    } else {
      orderByClause = order === 'asc' ? asc(leads.createdAt) : desc(leads.createdAt);
    }

    const allLeads = await db.select().from(leads).where(whereClause).orderBy(orderByClause);

    // Get unique industries for filter dropdown
    const industriesResult = await db.select({
      industry: leads.industry,
      count: sql<number>`count(*)`
    })
    .from(leads)
    .groupBy(leads.industry);

    return json({
      leads: allLeads,
      total: allLeads.length,
      industries: industriesResult
    });
  } catch (err) {
    console.error('Failed to fetch leads:', err);
    return json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function DELETE({ request, url }) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // empty body
    }

    const action = body.action || url.searchParams.get('action');
    const leadId = body.id || url.searchParams.get('id');

    if (action === 'delete_with_website') {
      // Bulk delete leads that have a website
      const deleted = await db.delete(leads).where(
        and(
          isNotNull(leads.website),
          ne(leads.website, '')
        )
      ).returning();

      // Broadcast update
      fetch('http://localhost:3001/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'QUEUE_UPDATE', action: 'bulk_deleted_website_leads' })
      }).catch(err => console.error('WS Broadcast failed:', err));

      return json({ success: true, count: deleted.length });
    }

    if (leadId) {
      // Delete single lead by ID
      const deleted = await db.delete(leads).where(eq(leads.id, leadId)).returning();

      // Broadcast update
      fetch('http://localhost:3001/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'QUEUE_UPDATE', action: 'lead_deleted', leadId })
      }).catch(err => console.error('WS Broadcast failed:', err));

      return json({ success: true, deletedId: leadId, count: deleted.length });
    }

    return json({ error: 'Missing leadId or action parameter' }, { status: 400 });
  } catch (err) {
    console.error('Failed to delete lead(s):', err);
    return json({ error: 'Failed to delete lead(s)' }, { status: 500 });
  }
}
