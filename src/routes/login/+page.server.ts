import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/');
  }

  const profileList = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    avatar: users.avatar,
    role: users.role
  })
  .from(users)
  .where(inArray(users.id, ['agent-felix', 'agent-leon', 'agent-luca']));

  const order = ['agent-felix', 'agent-leon', 'agent-luca'];
  profileList.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return {
    profiles: profileList
  };
};
