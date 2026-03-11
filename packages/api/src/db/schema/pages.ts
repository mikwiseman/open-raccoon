import {
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { agents } from './agents.js';
import { conversations } from './conversations.js';
import { users } from './users.js';

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id').references(() => agents.id),
    conversationId: uuid('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 255 }),
    slug: varchar('slug', { length: 128 }),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    r2Path: text('r2_path').notNull(),
    deployUrl: text('deploy_url'),
    customDomain: text('custom_domain'),
    version: integer('version').default(1),
    forkedFrom: uuid('forked_from'),
    visibility: varchar('visibility', { length: 16 }).default('public'),
    viewCount: bigint('view_count', { mode: 'number' }).default(0),
    insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqCreatorSlug: uniqueIndex('pages_creator_slug_idx').on(table.creatorId, table.slug),
  }),
);

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export const pageVersions = pgTable(
  'page_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    version: integer('version'),
    r2Path: text('r2_path'),
    changes: text('changes'),
    insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqPageVersion: uniqueIndex('page_versions_page_version_idx').on(table.pageId, table.version),
  }),
);

export type PageVersion = typeof pageVersions.$inferSelect;
export type NewPageVersion = typeof pageVersions.$inferInsert;
