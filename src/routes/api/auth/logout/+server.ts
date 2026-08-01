import { json } from '@sveltejs/kit';
import { invalidateSession } from '$lib/server/auth';

export async function POST({ cookies }) {
  const sessionToken = cookies.get('buff_session');

  if (sessionToken) {
    await invalidateSession(sessionToken);
  }

  cookies.delete('buff_session', { path: '/' });

  return json({ success: true, message: 'Erfolgreich abgemeldet.' });
}
