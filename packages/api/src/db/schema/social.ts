import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { agents } from './agents.js';
import { conversations } from './conversations.js';
import { users } from './users.js';

export const feedItemReferences = pgTable(
  'feed_item_references',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    referenceId: uuid('reference_id'),
    referenceType: varchar('reference_type', { length: 16 }),
    existsFlag: boolean('exists_flag').default(true),
    insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqReferenceIdType: uniqueIndex('feed_item_references_reference_idx').on(
      table.referenceId,
      table.referenceType,
    ),
  }),
);

export type FeedItemReference = typeof feedItemReferences.$inferSelect;
export type NewFeedItemReference = typeof feedItemReferences.$inferInsert;

export const feedItems = pgTable('feed_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id),
  type: varchar('type', { length: 16 }),
  referenceId: uuid('reference_id'),
  referenceType: varchar('reference_type', { length: 16 }),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  qualityScore: doublePrecision('quality_score').default(0),
  trendingScore: doublePrecision('trending_score').default(0),
  likeCount: integer('like_count').default(0),
  forkCount: integer('fork_count').default(0),
  viewCount: integer('view_count').default(0),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type FeedItem = typeof feedItems.$inferSelect;
export type NewFeedItem = typeof feedItems.$inferInsert;

export const feedLikes = pgTable(
  'feed_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    feedItemId: uuid('feed_item_id')
      .notNull()
      .references(() => feedItems.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqFeedItemUser: uniqueIndex('feed_likes_feed_item_user_idx').on(
      table.feedItemId,
      table.userId,
    ),
  }),
);

export type FeedLike = typeof feedLikes.$inferSelect;
export type NewFeedLike = typeof feedLikes.$inferInsert;

export const userFollows = pgTable(
  'user_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id),
    insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqFollowerFollowing: uniqueIndex('user_follows_follower_following_idx').on(
      table.followerId,
      table.followingId,
    ),
  }),
);

export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;

export const agentRatings = pgTable(
  'agent_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    rating: smallint('rating'),
    review: text('review'),
    accuracyScore: smallint('accuracy_score'),
    helpfulnessScore: smallint('helpfulness_score'),
    speedScore: smallint('speed_score'),
    conversationId: uuid('conversation_id'),
    messageId: uuid('message_id'),
    insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqAgentUser: uniqueIndex('agent_ratings_agent_user_idx').on(table.agentId, table.userId),
  }),
);

export type AgentRating = typeof agentRatings.$inferSelect;
export type NewAgentRating = typeof agentRatings.$inferInsert;

export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email'),
  token: text('token').unique(),
  used: boolean('used').default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
});

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type NewMagicLinkToken = typeof magicLinkTokens.$inferInsert;

export const messageFeedback = pgTable(
  'message_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').notNull(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    feedback: varchar('feedback', { length: 10 }).notNull(), // 'positive' | 'negative'
    reason: varchar('reason', { length: 30 }),
    insertedAt: timestamp('inserted_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqMessageUser: uniqueIndex('message_feedback_message_user_idx').on(
      table.messageId,
      table.userId,
    ),
  }),
);

export type MessageFeedback = typeof messageFeedback.$inferSelect;
export type NewMessageFeedback = typeof messageFeedback.$inferInsert;
