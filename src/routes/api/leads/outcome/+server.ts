import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads, callLogs } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ request }) {
  try {
    const { leadId, agentId, outcome, notes, wiedervorlageNote, customRescheduleAt, duration } = await request.json();

    if (!leadId) {
      return json({ error: 'leadId is required' }, { status: 400 });
    }

    let status = 'completed';
    let rescheduleAtDate: Date | null = null;

    if (outcome === 'Voicemail') {
      status = 'rescheduled';
      rescheduleAtDate = customRescheduleAt ? new Date(customRescheduleAt) : new Date(Date.now() + 60 * 60 * 1000);
    } else if (outcome === 'Interested - Follow up' || outcome === 'Wiedervorlage' || outcome === 'Callback') {
      status = 'rescheduled';
      rescheduleAtDate = customRescheduleAt ? new Date(customRescheduleAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Format note for lead record
    let updatedLeadNotes = notes ? `[${outcome}] ${notes}` : `[${outcome}]`;
    if (wiedervorlageNote) {
      updatedLeadNotes += ` | [WIEDERVORLAGE HINWEIS]: ${wiedervorlageNote}`;
    }

    // 1. Update lead status, notes, locked state, and rescheduleAt timestamp
    await db.update(leads)
      .set({
        status,
        notes: updatedLeadNotes,
        lockedBy: null,
        lockedAt: null,
        rescheduleAt: rescheduleAtDate
      })
      .where(eq(leads.id, leadId));

    // 2. Create a call log entry
    await db.insert(callLogs).values({
      id: crypto.randomUUID(),
      leadId,
      agentId: agentId || 'agent-felix',
      outcome: outcome === 'Interested - Follow up' ? 'Wiedervorlage' : outcome,
      notes: notes ? (wiedervorlageNote ? `${notes} (Wiedervorlage: ${wiedervorlageNote})` : notes) : (wiedervorlageNote || null),
      duration: duration ? Number(duration) : null
    });

    // 3. Broadcast WS event
    fetch('http://localhost:3001/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'QUEUE_UPDATE', action: 'lead_outcome_logged', leadId })
    }).catch(err => console.error('WS Broadcast failed:', err));

    return json({ success: true, rescheduleAt: rescheduleAtDate });
  } catch (err) {
    console.error('Failed to log outcome:', err);
    return json({ error: 'Failed to log outcome' }, { status: 500 });
  }
}
