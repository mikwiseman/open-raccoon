import {
  bigint,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const agentCrews = pgTable('agent_crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 64 }).notNull(),
  slug: varchar('slug', { length: 64 }).unique(),
  description: text('description'),
  visibility: varchar('visibility', { length: 16 }).default('private'),
  steps: jsonb('steps').notNull().default([]),
  category: varchar('category', { length: 32 }),
  usageCount: bigint('usage_count', { mode: 'number' }).default(0),
  ratingSum: integer('rating_sum').default(0),
  ratingCount: integer('rating_count').default(0),
  metadata: jsonb('metadata').default({}),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type AgentCrew = typeof agentCrews.$inferSelect;
export type NewAgentCrew = typeof agentCrews.$inferInsert;
