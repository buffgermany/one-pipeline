import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { eq, sql, and, ne } from 'drizzle-orm';

export async function pullNextLead(agentId: string, targetLeadId?: string, skipLeadId?: string) {
  if (targetLeadId) {
    // Lock the requested lead specifically
    const specificLead = await db.update(leads)
      .set({
        lockedBy: agentId,
        lockedAt: sql`CURRENT_TIMESTAMP`,
        status: 'in_progress'
      })
      .where(eq(leads.id, targetLeadId))
      .returning();

    if (specificLead.length > 0) return specificLead[0];
  }

  // If skipping current lead, unlock it first so it stays in queue for later
  if (skipLeadId) {
    await db.update(leads)
      .set({
        lockedBy: null,
        lockedAt: null,
        status: 'new'
      })
      .where(and(eq(leads.id, skipLeadId), eq(leads.lockedBy, agentId)));
  } else {
    // Check if agent already has an active locked lead
    const existingLock = await db.query.leads.findFirst({
      where: (leads, { eq }) => eq(leads.lockedBy, agentId)
    });
    
    if (existingLock) return existingLock;
  }

  // Build exclusion SQL if skipping
  const excludeClause = skipLeadId ? sql`AND id != ${skipLeadId}` : sql``;

  // Atomically lock and return the next highest-priority lead.
  // Priority 1: Rescheduled leads whose time has arrived.
  // Priority 2: New, uncalled leads.
  const pulledLeads = await db.update(leads)
    .set({
      lockedBy: agentId,
      lockedAt: sql`CURRENT_TIMESTAMP`,
      status: 'in_progress'
    })
    .where(
      sql`id = (
        SELECT id FROM leads 
        WHERE (locked_by IS NULL OR locked_at < datetime('now', '-30 minutes'))
        AND (
          (reschedule_at IS NOT NULL AND reschedule_at <= CURRENT_TIMESTAMP)
          OR 
          (status = 'new')
        )
        ${excludeClause}
        ORDER BY 
          CASE WHEN reschedule_at IS NOT NULL THEN 0 ELSE 1 END ASC,
          reschedule_at ASC,
          created_at ASC
        LIMIT 1
      )`
    )
    .returning();

  if (pulledLeads.length > 0) {
    fetch('http://localhost:3001/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'QUEUE_UPDATE', action: 'lead_locked', agentId })
    }).catch(err => console.error('WS Broadcast failed:', err));
  }

  return pulledLeads[0] || null;
}
