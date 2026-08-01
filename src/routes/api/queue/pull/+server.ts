import { json } from '@sveltejs/kit';
import { pullNextLead, type QueuePullFilters } from '$lib/server/actions/queue';

export async function POST({ request }) {
  const { agentId, targetLeadId, skippedLeadIds, skipLeadId, filters } = await request.json();
  
  if (!agentId) {
    return json({ error: 'agentId is required' }, { status: 400 });
  }

  // Combine skipLeadId into skippedLeadIds if provided
  const allSkipped: string[] = Array.isArray(skippedLeadIds) ? [...skippedLeadIds] : [];
  if (skipLeadId && !allSkipped.includes(skipLeadId)) {
    allSkipped.push(skipLeadId);
  }

  try {
    const lead = await pullNextLead(agentId, targetLeadId, allSkipped, filters as QueuePullFilters);
    
    if (!lead) {
      return json({ message: 'Keine passenden Leads für diese Filterkriterien vorhanden.' }, { status: 404 });
    }
    
    return json({ lead });
  } catch (err) {
    console.error('Queue pull error:', err);
    return json({ error: 'Failed to pull lead' }, { status: 500 });
  }
}
