import { json } from '@sveltejs/kit';
import { pullNextLead } from '$lib/server/actions/queue';

export async function POST({ request }) {
  const { agentId, targetLeadId, skipLeadId } = await request.json();
  
  if (!agentId) {
    return json({ error: 'agentId is required' }, { status: 400 });
  }

  try {
    const lead = await pullNextLead(agentId, targetLeadId, skipLeadId);
    
    if (!lead) {
      return json({ message: 'No leads available' }, { status: 404 });
    }
    
    return json({ lead });
  } catch (err) {
    console.error('Queue pull error:', err);
    return json({ error: 'Failed to pull lead' }, { status: 500 });
  }
}
