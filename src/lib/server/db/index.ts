import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';
import fs from 'node:fs';
import path from 'node:path';

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
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // 2. Ensure default agent user exists
  sqlite.exec(`
    INSERT OR IGNORE INTO users (id, name, email)
    VALUES ('agent-felix', 'Felix Krone', 'felix@buff.de');
  `);

  // 3. Ensure 'leads' table exists
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

  // 4. Ensure 'call_logs' table exists
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

  // 5. Inspect 'leads' table columns and auto-add ANY missing column
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
