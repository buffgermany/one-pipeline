import crypto from 'node:crypto';
import { db } from './db';
import { users, sessions, loginAttempts } from './db/schema';
import { eq, and, gt, gte, count } from 'drizzle-orm';

const SESSION_DURATION_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;

/**
 * Hash password securely using Argon2id (via Bun.password) or Crypto fallback
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof Bun !== 'undefined' && Bun.password) {
    return await Bun.password.hash(password, {
      algorithm: 'argon2id',
      timeCost: 3,
      memoryCost: 65536
    });
  }

  // Fallback to scrypt if Bun.password is unavailable
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password against hash with constant-time check
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;

  if (typeof Bun !== 'undefined' && Bun.password && !hash.startsWith('scrypt:')) {
    try {
      return await Bun.password.verify(password, hash);
    } catch {
      return false;
    }
  }

  if (hash.startsWith('scrypt:')) {
    const [, salt, originalHex] = hash.split(':');
    if (!salt || !originalHex) return false;
    const keyBuffer = Buffer.from(originalHex, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  return false;
}

/**
 * Create a new secure session token
 */
export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: token,
    userId,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    expiresAt
  });

  return { token, expiresAt };
}

/**
 * Validate session token and return user details
 */
export async function validateSessionToken(token: string) {
  if (!token) return null;

  const result = await db.select({
    session: sessions,
    user: {
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatar: users.avatar
    }
  })
  .from(sessions)
  .innerJoin(users, eq(sessions.userId, users.id))
  .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
  .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0].user;
}

/**
 * Delete a session
 */
export async function invalidateSession(token: string) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.id, token));
}

/**
 * Rate Limiting & Pentesting Lockout Check
 */
export async function checkRateLimit(userId: string | null, ipAddress: string) {
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);

  // Count failed attempts for this IP / User in the lockout window
  const attempts = await db.select({ value: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ipAddress, ipAddress),
        eq(loginAttempts.success, false),
        gte(loginAttempts.attemptedAt, windowStart)
      )
    );

  const failedCount = attempts[0]?.value || 0;

  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: LOCKOUT_WINDOW_MINUTES * 60
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_FAILED_ATTEMPTS - failedCount
  };
}

/**
 * Record a login attempt for audit & rate limiting
 */
export async function recordLoginAttempt(userId: string | null, ipAddress: string, success: boolean) {
  await db.insert(loginAttempts).values({
    id: crypto.randomUUID(),
    userId,
    ipAddress,
    success,
    attemptedAt: new Date()
  });
}
