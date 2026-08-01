import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads, callLogs } from '$lib/server/db/schema';
import { eq, or, sql, gte, and, isNotNull, ne } from 'drizzle-orm';

function parseDateSafely(val: any): Date {
  if (!val) return new Date();
  const d = new Date(val);
  if (d.getFullYear() < 2000) {
    return new Date(d.getTime() * 1000);
  }
  return d;
}

function formatTimeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours}h`;
  return date.toLocaleDateString('de-DE');
}

export async function GET() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Fetch Calls Today
    const todayCalls = await db.select({
      count: sql<number>`count(*)`
    })
    .from(callLogs)
    .where(gte(callLogs.createdAt, startOfToday));

    // 2. Fetch Conversions (Meeting Booked or Interested today)
    const todayConversions = await db.select({
      count: sql<number>`count(*)`
    })
    .from(callLogs)
    .where(and(
      gte(callLogs.createdAt, startOfToday),
      or(
        eq(callLogs.outcome, 'Meeting Booked'),
        eq(callLogs.outcome, 'Interested - Follow up')
      )
    ));

    // 3. Fetch Remaining Queue Leads
    const remaining = await db.select({
      count: sql<number>`count(*)`
    })
    .from(leads)
    .where(or(
      eq(leads.status, 'new'),
      and(
        eq(leads.status, 'rescheduled'),
        sql`${leads.rescheduleAt} <= CURRENT_TIMESTAMP`
      )
    ));

    // 4. Fetch Total Leads Count
    const totalLeadsRes = await db.select({
      count: sql<number>`count(*)`
    }).from(leads);
    const totalLeads = totalLeadsRes[0]?.count || 0;

    // 5. Fetch Decision Maker Count (% Quote)
    const dmRes = await db.select({
      count: sql<number>`count(*)`
    })
    .from(leads)
    .where(and(isNotNull(leads.decisionMaker), ne(leads.decisionMaker, '')));
    const leadsWithDm = dmRes[0]?.count || 0;
    const dmRatePercent = totalLeads > 0 ? Math.round((leadsWithDm / totalLeads) * 100) : 0;

    // 6. Fetch Unclaimed GMB Opportunities (isClaimed = false)
    const unclaimedRes = await db.select({
      count: sql<number>`count(*)`
    })
    .from(leads)
    .where(eq(leads.isClaimed, false));
    const unclaimedGmbCount = unclaimedRes[0]?.count || 0;

    // 7. Tech Stack Breakdown
    const techStackDistribution = await db.select({
      techStack: leads.techStack,
      count: sql<number>`count(*)`
    })
    .from(leads)
    .where(and(isNotNull(leads.techStack), ne(leads.techStack, '')))
    .groupBy(leads.techStack)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

    // 8. Fetch Call Logs for Activity Audit Trail
    const logs = await db.select({
      id: callLogs.id,
      outcome: callLogs.outcome,
      notes: callLogs.notes,
      createdAt: callLogs.createdAt,
      leadName: leads.name
    })
    .from(callLogs)
    .innerJoin(leads, eq(callLogs.leadId, leads.id))
    .orderBy(sql`${callLogs.createdAt} DESC`)
    .limit(10);

    // 9. Fetch Imports for Audit Trail
    const imports = await db.select({
      createdAt: leads.createdAt,
      filename: leads.importFilename,
      count: sql<number>`count(*)`
    })
    .from(leads)
    .groupBy(leads.createdAt, leads.importFilename)
    .orderBy(sql`${leads.createdAt} DESC`)
    .limit(8);

    // Combine and format recent activity & audit log
    const activityItems = [
      ...logs.map(l => {
        const date = parseDateSafely(l.createdAt);
        return {
          id: `call-${l.id}`,
          type: 'call',
          title: `Anruf bei "${l.leadName}"`,
          message: `Ergebnis: ${l.outcome}${l.notes ? ' • Notiz: ' + l.notes : ''}`,
          timestamp: date.getTime(),
          time: formatTimeAgo(date)
        };
      }),
      ...imports.map((imp, idx) => {
        const date = parseDateSafely(imp.createdAt);
        return {
          id: `import-${idx}-${date.getTime()}`,
          type: 'import',
          title: `Lead Import: ${imp.filename || 'G-Maps Scraper'}`,
          message: `+${imp.count} neue Unternehmen in Queue importiert`,
          timestamp: date.getTime(),
          time: formatTimeAgo(date)
        };
      })
    ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12);

    return json({
      stats: {
        callsToday: todayCalls[0]?.count || 0,
        conversions: todayConversions[0]?.count || 0,
        remainingLeads: remaining[0]?.count || 0,
        totalLeads,
        leadsWithDm,
        dmRatePercent,
        unclaimedGmbCount
      },
      techStackDistribution,
      recentActivity: activityItems
    });
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
    return json({ error: 'Failed to load dashboard stats' }, { status: 500 });
  }
}
