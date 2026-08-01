import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession, checkRateLimit, recordLoginAttempt } from '$lib/server/auth';

export async function POST({ request, getClientAddress, cookies }) {
  try {
    const { userId, password } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || getClientAddress();
    const userAgent = request.headers.get('user-agent') || undefined;

    if (!userId || !password) {
      return json({ error: 'Bitte Wähle ein Profil und gib das Passwort ein.' }, { status: 400 });
    }

    // 1. Pentesting Brute Force & Rate Limit Check
    const rateLimit = await checkRateLimit(userId, ipAddress);
    if (!rateLimit.allowed) {
      return json({
        error: `Zu viele fehlerhafte Anmeldeversuche. Bitte warte ${Math.ceil((rateLimit.retryAfterSeconds || 900) / 60)} Minuten.`,
        locked: true
      }, { status: 429 });
    }

    // 2. Fetch User Profile
    const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (targetUser.length === 0) {
      await recordLoginAttempt(userId, ipAddress, false);
      return json({ error: 'Profil nicht gefunden.' }, { status: 401 });
    }

    const user = targetUser[0];

    // 3. Verify Password Hash
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      await recordLoginAttempt(userId, ipAddress, false);
      const updatedLimit = await checkRateLimit(userId, ipAddress);
      
      return json({
        error: 'Falsches Passwort. Bitte erneut versuchen.',
        remainingAttempts: updatedLimit.remainingAttempts
      }, { status: 401 });
    }

    // 4. Successful Authentication
    await recordLoginAttempt(userId, ipAddress, true);
    const session = await createSession(user.id, ipAddress, userAgent);

    // 5. Set HttpOnly Secure Cookie
    cookies.set('buff_session', session.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: session.expiresAt
    });

    return json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login authentication error:', err);
    return json({ error: 'Serverfehler bei der Anmeldung.' }, { status: 500 });
  }
}
