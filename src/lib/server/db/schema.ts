import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`)
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
