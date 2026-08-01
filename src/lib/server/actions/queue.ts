import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export interface QueuePullFilters {
  category?: string;          // 'all' | 'gastro' | 'handwerk' | 'b2b' | 'praxis' | custom
  maxAuditScore?: number;     // e.g. 50 (< 50), 75 (< 75), -1 (no website)
  sortStrategy?: 'priority' | 'random' | 'rating' | 'reviews' | 'audit_lowest' | 'unclaimed';
  hasDirectPhone?: boolean;
}

export async function pullNextLead(
  agentId: string, 
  targetLeadId?: string, 
  skippedLeadIds: string[] = [],
  filters: QueuePullFilters = {}
) {
  // If targetLeadId is provided, lock it directly
  if (targetLeadId) {
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

  // Unlock all skipped leads locked by this agent so they return to 'new'
  if (skippedLeadIds.length > 0) {
    for (const skipId of skippedLeadIds) {
      await db.update(leads)
        .set({
          lockedBy: null,
          lockedAt: null,
          status: 'new'
        })
        .where(and(eq(leads.id, skipId), eq(leads.lockedBy, agentId)));
    }
  } else {
    // If not skipping, check if agent already has an active locked lead
    const existingLock = await db.query.leads.findFirst({
      where: (leads, { eq }) => eq(leads.lockedBy, agentId)
    });
    
    if (existingLock) return existingLock;
  }

  // Build Filter SQL Clauses
  const filterConditions: string[] = [];

  // 1. Category Filter
  if (filters.category && filters.category !== 'all') {
    const cat = filters.category.toLowerCase();
    if (cat === 'handwerk') {
      filterConditions.push(`(LOWER(industry) LIKE '%handwerk%' OR LOWER(industry) LIKE '%bau%' OR LOWER(industry) LIKE '%sanitär%' OR LOWER(industry) LIKE '%elektro%' OR LOWER(industry) LIKE '%tischler%' OR LOWER(category) LIKE '%handwerk%')`);
    } else if (cat === 'gastro') {
      filterConditions.push(`(LOWER(industry) LIKE '%gastro%' OR LOWER(industry) LIKE '%restaurant%' OR LOWER(industry) LIKE '%bar%' OR LOWER(industry) LIKE '%cafe%' OR LOWER(category) LIKE '%restaurant%' OR LOWER(category) LIKE '%bar%')`);
    } else if (cat === 'praxis') {
      filterConditions.push(`(LOWER(industry) LIKE '%praxis%' OR LOWER(industry) LIKE '%arzt%' OR LOWER(industry) LIKE '%zahnarzt%' OR LOWER(category) LIKE '%arzt%')`);
    } else if (cat === 'b2b') {
      filterConditions.push(`(LOWER(industry) LIKE '%b2b%' OR LOWER(industry) LIKE '%berater%' OR LOWER(industry) LIKE '%agentur%' OR LOWER(industry) LIKE '%service%')`);
    } else {
      const safeCat = cat.replace(/'/g, "''");
      filterConditions.push(`(LOWER(industry) LIKE '%${safeCat}%' OR LOWER(category) LIKE '%${safeCat}%')`);
    }
  }

  // 2. Audit Score / Website Filter
  if (filters.maxAuditScore !== undefined && filters.maxAuditScore !== null) {
    if (filters.maxAuditScore === -1) {
      // No website leads only
      filterConditions.push(`(website IS NULL OR website = '')`);
    } else if (filters.maxAuditScore === 50) {
      // Low score (< 50)
      filterConditions.push(`(audit_score IS NOT NULL AND audit_score < 50)`);
    } else if (filters.maxAuditScore === 75) {
      // Ausbaufähig (< 75)
      filterConditions.push(`(audit_score IS NOT NULL AND audit_score < 75)`);
    }
  }

  // 3. Direct Phone Filter
  if (filters.hasDirectPhone) {
    filterConditions.push(`(direct_phone IS NOT NULL AND direct_phone != '')`);
  }

  // Build Order By Clause
  let orderByClause = `ORDER BY CASE WHEN reschedule_at IS NOT NULL THEN 0 ELSE 1 END ASC, reschedule_at ASC, created_at ASC`;
  if (filters.sortStrategy === 'random') {
    orderByClause = `ORDER BY RANDOM()`;
  } else if (filters.sortStrategy === 'rating') {
    orderByClause = `ORDER BY CAST(rating AS FLOAT) DESC, created_at ASC`;
  } else if (filters.sortStrategy === 'reviews') {
    orderByClause = `ORDER BY reviews DESC, created_at ASC`;
  } else if (filters.sortStrategy === 'audit_lowest') {
    orderByClause = `ORDER BY audit_score ASC, created_at ASC`;
  } else if (filters.sortStrategy === 'unclaimed') {
    orderByClause = `ORDER BY is_claimed ASC, created_at ASC`;
  }

  const filterSqlStr = filterConditions.length > 0 ? `AND ${filterConditions.join(' AND ')}` : '';

  // Helper to query and lock
  async function queryAndLock(excludeIds: string[]) {
    let excludeSql = '';
    if (excludeIds.length > 0) {
      const quotedIds = excludeIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
      excludeSql = `AND id NOT IN (${quotedIds})`;
    }

    const query = sql.raw(`id = (
      SELECT id FROM leads 
      WHERE (locked_by IS NULL OR locked_at < datetime('now', '-30 minutes'))
      AND (
        (reschedule_at IS NOT NULL AND reschedule_at <= CURRENT_TIMESTAMP)
        OR 
        (status = 'new')
      )
      ${filterSqlStr}
      ${excludeSql}
      ${orderByClause}
      LIMIT 1
    )`);

    return await db.update(leads)
      .set({
        lockedBy: agentId,
        lockedAt: sql`CURRENT_TIMESTAMP`,
        status: 'in_progress'
      })
      .where(query)
      .returning();
  }

  // Attempt 1: Exclude skippedLeadIds
  let pulledLeads = await queryAndLock(skippedLeadIds);

  // Attempt 2: If no lead found and we were skipping, wrap around by trying without skippedLeadIds
  if (pulledLeads.length === 0 && skippedLeadIds.length > 0) {
    pulledLeads = await queryAndLock([]);
  }

  if (pulledLeads.length > 0) {
    fetch('http://localhost:3001/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'QUEUE_UPDATE', action: 'lead_locked', agentId })
    }).catch(err => console.error('WS Broadcast failed:', err));
  }

  return pulledLeads[0] || null;
}
