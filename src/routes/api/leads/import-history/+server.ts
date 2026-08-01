import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { desc, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const history = await db.select({
      createdAt: leads.createdAt,
      filename: leads.importFilename,
      count: sql<number>`count(*)`
    })
    .from(leads)
    .groupBy(leads.createdAt, leads.importFilename)
    .orderBy(desc(leads.createdAt))
    .limit(20);

    return json(history.map(row => ({
      date: row.createdAt ? new Date(row.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }) : 'Unknown',
      filename: row.filename || 'Direct Import',
      count: row.count
    })));
  } catch (err) {
    console.error('Failed to fetch import history:', err);
    return json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
