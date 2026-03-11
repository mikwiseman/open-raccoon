import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { agents } from './agents.js';
import { conversations } from './conversations.js';

export const agentSources = pgTable('agent_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }),
  type: varchar('type', { length: 20 }),
  url: text('url'),
  config: jsonb('config').default({}),
  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type AgentSource = typeof agentSources.$inferSelect;
export type NewAgentSource = typeof agentSources.$inferInsert;

export const agentArticles = pgTable('agent_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => agentSources.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }),
  url: text('url'),
  content: text('content'),
  summary: text('summary'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  collectedAt: timestamp('collected_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type AgentArticle = typeof agentArticles.$inferSelect;
export type NewAgentArticle = typeof agentArticles.$inferInsert;

export const agentProposals = pgTable('agent_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('draft'),
  actions: jsonb('actions').default([]),
  metadata: jsonb('metadata').default({}),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type AgentProposal = typeof agentProposals.$inferSelect;
export type NewAgentProposal = typeof agentProposals.$inferInsert;
