import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { eq, or, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const queue = await db.query.leads.findMany({
      where: or(
        eq(leads.status, 'new'),
        sql`${leads.rescheduleAt} <= CURRENT_TIMESTAMP`,
        eq(leads.status, 'in_progress')
      ),
      orderBy: (leads, { asc, sql }) => [
        sql`CASE WHEN ${leads.rescheduleAt} IS NOT NULL THEN 0 ELSE 1 END ASC`,
        asc(leads.rescheduleAt),
        asc(leads.createdAt)
      ]
    });
    
    return json(queue);
  } catch (err) {
    return json({ error: 'Failed to load queue' }, { status: 500 });
  }
}
