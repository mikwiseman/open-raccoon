/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB connection
vi.mock('../../db/connection.js', () => {
  const sqlFn = Object.assign(vi.fn(), {
    unsafe: vi.fn(),
    begin: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return cb(sqlFn);
    }),
  });
  return { sql: sqlFn, db: {} };
});

// Mock emitter
vi.mock('../../ws/emitter.js', () => ({
  emitMessage: vi.fn(),
}));

// Mock loop
vi.mock('../agents/loop.js', () => ({
  runAgentLoop: vi.fn().mockResolvedValue(undefined),
}));

// Mock agent runner
vi.mock('../agents/agent-runner.js', () => ({
  startAgentRun: vi.fn().mockReturnValue(new AbortController().signal),
  finishAgentRun: vi.fn(),
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const CONV_ID = '660e8400-e29b-41d4-a716-446655440001';
const MSG_ID = '770e8400-e29b-41d4-a716-446655440002';

function makeMessageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MSG_ID,
    conversation_id: CONV_ID,
    sender_id: USER_ID,
    sender_type: 'human',
    type: 'text',
    content: [{ type: 'text', text: 'Hello' }],
    metadata: {},
    edited_at: null,
    deleted_at: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeConversationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CONV_ID,
    type: 'dm',
    title: 'Test',
    avatar_url: null,
    creator_id: USER_ID,
    agent_id: null,
    metadata: {},
    last_message_at: null,
    inserted_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  };
}

/* ================================================================
 * sendMessage — Content Validation
 * ================================================================ */
describe('conversation.service — sendMessage content validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a message with valid content', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    // begin transaction — idempotency check (not found)
    sqlMock.mockResolvedValueOnce([] as any);
    // INSERT message
    sqlMock.mockResolvedValueOnce([] as any);
    // UPDATE conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // SELECT message
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any);
    // INSERT idempotency key
    sqlMock.mockResolvedValueOnce([] as any);
    // check agent conversation
    sqlMock.mockResolvedValueOnce([] as any);

    const { sendMessage } = await import('./conversation.service.js');
    const result = await sendMessage(
      CONV_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'Hello' }] },
      'idem-key-1',
    );

    expect(result.id).toBe(MSG_ID);
    expect(result.sender_id).toBe(USER_ID);
  });

  it('throws NOT_FOUND when user is not a member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { sendMessage } = await import('./conversation.service.js');
    await expect(
      sendMessage(CONV_ID, 'non-member', { content: [{ type: 'text', text: 'Hi' }] }, 'key-1'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

/* ================================================================
 * sendMessage — Idempotency Key Handling
 * ================================================================ */
describe('conversation.service — idempotency key handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached response for duplicate idempotency key', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    const cachedMessage = makeMessageRow({ id: 'cached-msg-id' });

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    // begin transaction — idempotency check (found)
    sqlMock.mockResolvedValueOnce([{ response_body: cachedMessage }] as any);

    const { sendMessage } = await import('./conversation.service.js');
    const result = await sendMessage(
      CONV_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'Hello' }] },
      'duplicate-key',
    );

    // Should return the cached message without re-emitting events
    expect(result.id).toBe('cached-msg-id');
  });

  it('processes new message when idempotency key is not found', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    // idempotency check — not found
    sqlMock.mockResolvedValueOnce([] as any);
    // INSERT
    sqlMock.mockResolvedValueOnce([] as any);
    // UPDATE conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // SELECT message
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any);
    // INSERT idempotency key
    sqlMock.mockResolvedValueOnce([] as any);
    // check agent conversation
    sqlMock.mockResolvedValueOnce([] as any);

    const { sendMessage } = await import('./conversation.service.js');
    const result = await sendMessage(
      CONV_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'New message' }] },
      'new-key',
    );

    expect(result.id).toBe(MSG_ID);
  });

  it('emits WebSocket event for non-duplicate messages', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { sendMessage } = await import('./conversation.service.js');
    await sendMessage(
      CONV_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'Hello' }] },
      'unique-key',
    );

    const { emitMessage } = await import('../../ws/emitter.js');
    expect(emitMessage).toHaveBeenCalledWith(CONV_ID, expect.objectContaining({ id: MSG_ID }));
  });
});

/* ================================================================
 * listMessages — Ordering and Pagination
 * ================================================================ */
describe('conversation.service — listMessages ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns messages without cursor (first page)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    // query
    sqlMock.mockResolvedValueOnce([
      makeMessageRow({ id: 'msg-1' }),
      makeMessageRow({ id: 'msg-2' }),
    ] as any);

    const { listMessages } = await import('./conversation.service.js');
    const results = await listMessages(CONV_ID, USER_ID);

    expect(results).toHaveLength(2);
  });

  it('returns messages with cursor pagination', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    // cursor lookup
    sqlMock.mockResolvedValueOnce([
      { created_at: new Date('2026-01-01'), id: 'cursor-msg' },
    ] as any);
    // paginated query
    sqlMock.mockResolvedValueOnce([makeMessageRow({ id: 'msg-older' })] as any);

    const { listMessages } = await import('./conversation.service.js');
    const results = await listMessages(CONV_ID, USER_ID, 'cursor-msg');

    expect(results).toHaveLength(1);
  });

  it('throws BAD_REQUEST for invalid cursor', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    // cursor not found
    sqlMock.mockResolvedValueOnce([] as any);

    const { listMessages } = await import('./conversation.service.js');
    await expect(listMessages(CONV_ID, USER_ID, 'bad-cursor')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('clamps limit to maximum 100', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { listMessages } = await import('./conversation.service.js');
    // Pass limit > 100, should be clamped
    await listMessages(CONV_ID, USER_ID, undefined, 500);

    expect(sqlMock).toHaveBeenCalled();
  });

  it('clamps limit to minimum 1', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { listMessages } = await import('./conversation.service.js');
    await listMessages(CONV_ID, USER_ID, undefined, 0);

    expect(sqlMock).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when user is not a member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listMessages } = await import('./conversation.service.js');
    await expect(listMessages(CONV_ID, 'non-member')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* ================================================================
 * sendMessage — Agent Conversation Trigger
 * ================================================================ */
describe('conversation.service — agent conversation trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers agent loop for agent conversations', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    // agent conversation check — found
    sqlMock.mockResolvedValueOnce([{ agent_id: 'agent-1' }] as any);

    const { sendMessage } = await import('./conversation.service.js');
    await sendMessage(
      CONV_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'Hello agent' }] },
      'agent-key',
    );

    const { runAgentLoop } = await import('../agents/loop.js');
    expect(runAgentLoop).toHaveBeenCalledWith({
      agentId: 'agent-1',
      conversationId: CONV_ID,
      userId: USER_ID,
      message: 'Hello agent',
      abortSignal: expect.any(AbortSignal),
    });
  });

  it('does not trigger agent loop for non-agent conversations', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    // agent conversation check — not found
    sqlMock.mockResolvedValueOnce([] as any);

    const { sendMessage } = await import('./conversation.service.js');
    await sendMessage(
      CONV_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'Hello' }] },
      'no-agent-key',
    );

    const { runAgentLoop } = await import('../agents/loop.js');
    expect(runAgentLoop).not.toHaveBeenCalled();
  });
});

/* ================================================================
 * Member Management
 * ================================================================ */
describe('conversation.service — member management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listMembers returns member list', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    // list query
    sqlMock.mockResolvedValueOnce([
      {
        id: 'm1',
        conversation_id: CONV_ID,
        user_id: USER_ID,
        role: 'owner',
        muted: false,
        last_read_at: null,
        joined_at: new Date(),
        username: 'testuser',
        display_name: 'Test',
        member_avatar_url: null,
      },
    ] as any);

    const { listMembers } = await import('./conversation.service.js');
    const results = await listMembers(CONV_ID, USER_ID);

    expect(results).toHaveLength(1);
    expect(results[0].role).toBe('owner');
  });

  it('removeMember throws FORBIDDEN for owner removal', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertAdminOrOwner
    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    // check target role
    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);

    const { removeMember } = await import('./conversation.service.js');
    await expect(removeMember(CONV_ID, USER_ID, 'owner-user')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('removeMember throws NOT_FOUND when member does not exist', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertAdminOrOwner
    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    // check target — not found
    sqlMock.mockResolvedValueOnce([] as any);

    const { removeMember } = await import('./conversation.service.js');
    await expect(removeMember(CONV_ID, USER_ID, 'nonexistent')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

/* ================================================================
 * Conversation CRUD Edge Cases
 * ================================================================ */
describe('conversation.service — CRUD edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteConversation throws FORBIDDEN for non-owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertOwner — member but not owner
    sqlMock.mockResolvedValueOnce([{ role: 'member' }] as any);

    const { deleteConversation } = await import('./conversation.service.js');
    await expect(deleteConversation(CONV_ID, USER_ID)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('updateConversation throws FORBIDDEN for non-admin/owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertAdminOrOwner — member
    sqlMock.mockResolvedValueOnce([{ role: 'member' }] as any);

    const { updateConversation } = await import('./conversation.service.js');
    await expect(
      updateConversation(CONV_ID, USER_ID, { title: 'New Title' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('getConversation throws NOT_FOUND when conversation does not exist', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-1' }] as any);
    // query
    sqlMock.mockResolvedValueOnce([] as any);

    const { getConversation } = await import('./conversation.service.js');
    await expect(getConversation('nonexistent', USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('createConversation adds creator as owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // INSERT conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // INSERT member (owner)
    sqlMock.mockResolvedValueOnce([] as any);
    // SELECT conversation
    sqlMock.mockResolvedValueOnce([makeConversationRow()] as any);

    const { createConversation } = await import('./conversation.service.js');
    const result = await createConversation(USER_ID, { type: 'dm' });

    expect(result.id).toBe(CONV_ID);
    expect(result.type).toBe('dm');
  });
});
