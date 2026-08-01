import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

export async function GET() {
  try {
    const profileList = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: users.role
    })
    .from(users)
    .where(inArray(users.id, ['agent-felix', 'agent-leon', 'agent-luca']));

    // Sort in exact order: Felix, Leon, Luca
    const order = ['agent-felix', 'agent-leon', 'agent-luca'];
    profileList.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

    return json({ profiles: profileList });
  } catch (err) {
    console.error('Failed to fetch auth profiles:', err);
    return json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}
