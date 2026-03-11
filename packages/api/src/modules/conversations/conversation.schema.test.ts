import { describe, expect, it } from 'vitest';
import {
  AddMemberSchema,
  CreateConversationSchema,
  SendMessageSchema,
  UpdateConversationSchema,
} from './conversation.schema.js';

/* ================================================================
 * CreateConversationSchema
 * ================================================================ */
describe('CreateConversationSchema', () => {
  it('accepts a valid dm conversation', () => {
    const data = { type: 'dm' as const };
    expect(CreateConversationSchema.parse(data)).toEqual(data);
  });

  it('accepts a group conversation with title and members', () => {
    const data = {
      type: 'group' as const,
      title: 'Team Chat',
      member_ids: ['550e8400-e29b-41d4-a716-446655440000'],
    };
    const result = CreateConversationSchema.parse(data);
    expect(result.type).toBe('group');
    expect(result.title).toBe('Team Chat');
    expect(result.member_ids).toHaveLength(1);
  });

  it('accepts an agent conversation', () => {
    const data = { type: 'agent' as const };
    expect(CreateConversationSchema.parse(data).type).toBe('agent');
  });

  it('rejects an invalid type', () => {
    const result = CreateConversationSchema.safeParse({ type: 'channel' });
    expect(result.success).toBe(false);
  });

  it('rejects missing type', () => {
    const result = CreateConversationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 255 characters', () => {
    const result = CreateConversationSchema.safeParse({
      type: 'group',
      title: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID in member_ids', () => {
    const result = CreateConversationSchema.safeParse({
      type: 'group',
      member_ids: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty member_ids array', () => {
    const data = { type: 'group' as const, member_ids: [] };
    const result = CreateConversationSchema.parse(data);
    expect(result.member_ids).toEqual([]);
  });
});

/* ================================================================
 * UpdateConversationSchema
 * ================================================================ */
describe('UpdateConversationSchema', () => {
  it('accepts a valid title update', () => {
    const result = UpdateConversationSchema.parse({ title: 'New Title' });
    expect(result.title).toBe('New Title');
  });

  it('accepts an empty object', () => {
    expect(UpdateConversationSchema.parse({})).toEqual({});
  });

  it('accepts avatar_url', () => {
    const result = UpdateConversationSchema.parse({ avatar_url: 'https://example.com/img.png' });
    expect(result.avatar_url).toBe('https://example.com/img.png');
  });

  it('rejects invalid avatar_url', () => {
    const result = UpdateConversationSchema.safeParse({ avatar_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 255 characters', () => {
    const result = UpdateConversationSchema.safeParse({ title: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * SendMessageSchema
 * ================================================================ */
describe('SendMessageSchema', () => {
  it('accepts a valid text message', () => {
    const data = { content: [{ type: 'text', text: 'Hello world' }] };
    const result = SendMessageSchema.parse(data);
    expect(result.content).toHaveLength(1);
  });

  it('accepts a message with multiple content blocks', () => {
    const data = {
      content: [
        { type: 'text', text: 'Check this code:' },
        { type: 'code_block', language: 'ts', code: 'const x = 1;' },
      ],
    };
    const result = SendMessageSchema.parse(data);
    expect(result.content).toHaveLength(2);
  });

  it('rejects empty content array', () => {
    const result = SendMessageSchema.safeParse({ content: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing content', () => {
    const result = SendMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects content with invalid block type', () => {
    const result = SendMessageSchema.safeParse({
      content: [{ type: 'unknown', data: 'test' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects content exceeding 100KB', () => {
    const hugeText = 'x'.repeat(100001);
    const result = SendMessageSchema.safeParse({
      content: [{ type: 'text', text: hugeText }],
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * AddMemberSchema
 * ================================================================ */
describe('AddMemberSchema', () => {
  it('accepts a valid member with default role', () => {
    const data = { user_id: '550e8400-e29b-41d4-a716-446655440000' };
    const result = AddMemberSchema.parse(data);
    expect(result.user_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.role).toBe('member');
  });

  it('accepts a member with admin role', () => {
    const data = { user_id: '550e8400-e29b-41d4-a716-446655440000', role: 'admin' as const };
    const result = AddMemberSchema.parse(data);
    expect(result.role).toBe('admin');
  });

  it('rejects invalid UUID for user_id', () => {
    const result = AddMemberSchema.safeParse({ user_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = AddMemberSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      role: 'owner',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing user_id', () => {
    const result = AddMemberSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
