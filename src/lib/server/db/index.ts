import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Support persistent volume path for Docker & Coolify deployments
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'sqlite.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`🗄️ [Database] Connecting to SQLite database at: ${dbPath}`);
const sqlite = new Database(dbPath);

// Enable WAL mode for high performance & concurrency
sqlite.exec('PRAGMA journal_mode = WAL;');

// Auto-Migration Helper: Ensure tables and ALL columns exist in sqlite.db
try {
  // 1. Ensure 'users' table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL DEFAULT '',
      avatar TEXT,
      role TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Inspect 'users' table columns and auto-add missing columns
  const userTableInfo = sqlite.prepare("PRAGMA table_info('users')").all() as { name: string }[];
  const userCols = new Set(userTableInfo.map(c => c.name));

  if (!userCols.has('password_hash')) {
    sqlite.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';`);
  }
  if (!userCols.has('avatar')) {
    sqlite.exec(`ALTER TABLE users ADD COLUMN avatar TEXT;`);
  }
  if (!userCols.has('role')) {
    sqlite.exec(`ALTER TABLE users ADD COLUMN role TEXT;`);
  }

  // Helper to hash password synchronously for seeding
  function getSeedHash(pass: string): string {
    if (typeof Bun !== 'undefined' && Bun.password?.hashSync) {
      return Bun.password.hashSync(pass, { algorithm: 'argon2id', timeCost: 3, memoryCost: 65536 });
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(pass, salt, 64);
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  const defaultUsers = [
    { id: 'agent-felix', name: 'Felix', email: 'felix@buff.de', pass: 'felix123', avatar: 'FX', role: 'Sales Lead' },
    { id: 'agent-leon', name: 'Leon', email: 'leon@buff.de', pass: 'leon123', avatar: 'LN', role: 'Sales Co-Pilot' },
    { id: 'agent-luca', name: 'Luca', email: 'luca@buff.de', pass: 'luca123', avatar: 'LC', role: 'Sales Co-Pilot' }
  ];

  for (const u of defaultUsers) {
    const existing = sqlite.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(u.id) as { id: string; password_hash: string } | undefined;
    if (!existing) {
      const hash = getSeedHash(u.pass);
      sqlite.prepare(`
        INSERT INTO users (id, name, email, password_hash, avatar, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(u.id, u.name, u.email, hash, u.avatar, u.role);
      console.log(`👤 [Auth Seed] Initialized user profile: ${u.name} (${u.id})`);
    } else {
      const hash = (!existing.password_hash || existing.password_hash === '') ? getSeedHash(u.pass) : existing.password_hash;
      sqlite.prepare('UPDATE users SET name = ?, password_hash = ?, avatar = ?, role = ? WHERE id = ?').run(u.name, hash, u.avatar, u.role, u.id);
    }
  }

  // 2. Ensure 'sessions' table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      ip_address TEXT,
      user_agent TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // 3. Ensure 'login_attempts' table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      ip_address TEXT NOT NULL,
      user_id TEXT,
      attempted_at INTEGER DEFAULT (strftime('%s', 'now')),
      success INTEGER NOT NULL
    );
  `);

  // 4. Ensure 'leads' table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      industry TEXT NOT NULL DEFAULT 'Allgemein',
      status TEXT NOT NULL DEFAULT 'new',
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // 5. Ensure 'call_logs' table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS call_logs (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      notes TEXT,
      duration INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // 6. Ensure 'search_history' table exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      industry TEXT,
      city TEXT,
      leads_found INTEGER DEFAULT 0,
      enriched_count INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Inspect 'leads' table columns and auto-add ANY missing column
  const tableInfo = sqlite.prepare("PRAGMA table_info('leads')").all() as { name: string }[];
  const existingColumns = new Set(tableInfo.map(c => c.name));

  const allLeadsColumns: [string, string][] = [
    ['website_phone', 'TEXT'],
    ['notes', 'TEXT'],
    ['locked_by', 'TEXT'],
    ['locked_at', 'INTEGER'],
    ['reschedule_at', 'INTEGER'],
    ['import_filename', 'TEXT'],
    ['website', 'TEXT'],
    ['place_id', 'TEXT'],
    ['email', 'TEXT'],
    ['facebook', 'TEXT'],
    ['instagram', 'TEXT'],
    ['linkedin', 'TEXT'],
    ['featured_image', 'TEXT'],
    ['rating', 'TEXT'],
    ['reviews', 'INTEGER'],
    ['address', 'TEXT'],
    ['category', 'TEXT'],
    ['decision_maker', 'TEXT'],
    ['tech_stack', 'TEXT'],
    ['direct_email', 'TEXT'],
    ['direct_phone', 'TEXT'],
    ['enrichment_sources', 'TEXT'],
    ['open_status', 'TEXT'],
    ['price_level', 'TEXT'],
    ['google_maps_url', 'TEXT'],
    ['is_ad', 'INTEGER DEFAULT 0'],
    ['is_claimed', 'INTEGER DEFAULT 1']
  ];

  for (const [colName, colType] of allLeadsColumns) {
    if (!existingColumns.has(colName)) {
      console.log(`🔧 [Auto-Migration] Adding missing column '${colName}' to 'leads' table in sqlite.db...`);
      sqlite.exec(`ALTER TABLE leads ADD COLUMN ${colName} ${colType};`);
    }
  }

} catch (e) {
  console.error('Auto-migration error:', e);
}

export const db = drizzle({ client: sqlite, schema });
