import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar'),
  role: text('role'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
});

export const loginAttempts = sqliteTable('login_attempts', {
  id: text('id').primaryKey(),
  ipAddress: text('ip_address').notNull(),
  userId: text('user_id'),
  attemptedAt: integer('attempted_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  success: integer('success', { mode: 'boolean' }).notNull()
});

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  websitePhone: text('website_phone'), // Enriched Impressum/Website Phone Number
  industry: text('industry').notNull(),
  
  // Status tracking
  status: text('status').notNull().default('new'), // new, in_progress, completed, rescheduled
  notes: text('notes'),
  
  // Queue & Locking mechanisms
  lockedBy: text('locked_by').references(() => users.id),
  lockedAt: integer('locked_at', { mode: 'timestamp' }),
  rescheduleAt: integer('reschedule_at', { mode: 'timestamp' }),
  
  importFilename: text('import_filename'),
  website: text('website'),
  placeId: text('place_id'),
  email: text('email'),
  facebook: text('facebook'),
  instagram: text('instagram'),
  linkedin: text('linkedin'),
  featuredImage: text('featured_image'),
  rating: text('rating'),
  reviews: integer('reviews'),
  address: text('address'),
  category: text('category'),
  decisionMaker: text('decision_maker'),
  techStack: text('tech_stack'),
  directEmail: text('direct_email'),
  directPhone: text('direct_phone'),
  enrichmentSources: text('enrichment_sources'),
  openStatus: text('open_status'),
  priceLevel: text('price_level'),
  googleMapsUrl: text('google_maps_url'),
  isAd: integer('is_ad', { mode: 'boolean' }).default(false),
  isClaimed: integer('is_claimed', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
});

export const callLogs = sqliteTable('call_logs', {
  id: text('id').primaryKey(),
  leadId: text('lead_id').references(() => leads.id).notNull(),
  agentId: text('agent_id').references(() => users.id).notNull(),
  outcome: text('outcome').notNull(),
  notes: text('notes'),
  duration: integer('duration'), // in seconds
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
});

export const searchHistory = sqliteTable('search_history', {
  id: text('id').primaryKey(),
  query: text('query').notNull(),
  industry: text('industry'),
  city: text('city'),
  leadsFound: integer('leads_found').default(0),
  enrichedCount: integer('enriched_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
});
