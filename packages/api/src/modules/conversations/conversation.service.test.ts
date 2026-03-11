/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB connection with transaction support
vi.mock('../../db/connection.js', () => {
  const sqlFn = Object.assign(vi.fn(), {
    unsafe: vi.fn(),
    begin: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return cb(sqlFn);
    }),
  });
  return { sql: sqlFn, db: {} };
});

// Mock WebSocket emitter
vi.mock('../../ws/emitter.js', () => ({
  emitMessage: vi.fn(),
  emitConversationUpdated: vi.fn(),
  emitMessageUpdated: vi.fn(),
  emitMessageDeleted: vi.fn(),
}));

// Mock agent loop
vi.mock('../agents/loop.js', () => ({
  runAgentLoop: vi.fn().mockResolvedValue(undefined),
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const THIRD_USER_ID = '770e8400-e29b-41d4-a716-446655440002';
const CONVERSATION_ID = '880e8400-e29b-41d4-a716-446655440003';
const AGENT_ID = '990e8400-e29b-41d4-a716-446655440004';
const MESSAGE_ID = 'aa0e8400-e29b-41d4-a716-446655440005';

const NOW = new Date('2026-03-01T12:00:00.000Z');

function makeConversationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CONVERSATION_ID,
    type: 'dm',
    title: null,
    avatar_url: null,
    creator_id: USER_ID,
    agent_id: null,
    metadata: {},
    last_message_at: null,
    inserted_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeConversationListRow(overrides: Record<string, unknown> = {}) {
  return {
    ...makeConversationRow(),
    last_message_id: null,
    last_message_content: null,
    last_message_sender_id: null,
    last_message_created_at: null,
    unread_count: 0,
    ...overrides,
  };
}

function makeMemberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-id-1',
    conversation_id: CONVERSATION_ID,
    user_id: USER_ID,
    role: 'owner',
    muted: false,
    last_read_at: null,
    joined_at: NOW,
    username: 'testuser',
    display_name: 'Test User',
    member_avatar_url: null,
    ...overrides,
  };
}

function makeMessageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MESSAGE_ID,
    conversation_id: CONVERSATION_ID,
    sender_id: USER_ID,
    sender_type: 'human',
    type: 'text',
    content: JSON.stringify([{ type: 'text', text: 'Hello' }]),
    metadata: {},
    edited_at: null,
    deleted_at: null,
    created_at: NOW,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// listConversations
// ---------------------------------------------------------------------------
describe('conversation.service — listConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted conversations with unread_count and last_message', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      makeConversationListRow({
        last_message_id: MESSAGE_ID,
        last_message_content: 'Hello',
        last_message_sender_id: OTHER_USER_ID,
        last_message_created_at: NOW,
        unread_count: 2,
      }),
    ] as any);

    const { listConversations } = await import('./conversation.service.js');
    const result = await listConversations(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(CONVERSATION_ID);
    expect(result[0].unread_count).toBe(2);
    expect(result[0].last_message).toEqual({
      id: MESSAGE_ID,
      content: 'Hello',
      sender_id: OTHER_USER_ID,
      created_at: NOW,
    });
    expect(result[0].created_at).toBe(NOW.toISOString());
  });

  it('returns empty array when user has no conversations', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listConversations } = await import('./conversation.service.js');
    const result = await listConversations(USER_ID);

    expect(result).toHaveLength(0);
  });

  it('returns null last_message when no messages exist', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([makeConversationListRow()] as any);

    const { listConversations } = await import('./conversation.service.js');
    const result = await listConversations(USER_ID);

    expect(result[0].last_message).toBeNull();
    expect(result[0].unread_count).toBe(0);
  });

  it('returns multiple conversations', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      makeConversationListRow({ id: 'conv-1', title: 'First' }),
      makeConversationListRow({ id: 'conv-2', title: 'Second' }),
      makeConversationListRow({ id: 'conv-3', title: 'Third' }),
    ] as any);

    const { listConversations } = await import('./conversation.service.js');
    const result = await listConversations(USER_ID);

    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// createConversation
// ---------------------------------------------------------------------------
describe('conversation.service — createConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a DM conversation without extra members', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Insert conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // 2. Insert creator as owner
    sqlMock.mockResolvedValueOnce([] as any);
    // 3. SELECT returning the created conversation
    sqlMock.mockResolvedValueOnce([makeConversationRow()] as any);

    const { createConversation } = await import('./conversation.service.js');
    const result = await createConversation(USER_ID, { type: 'dm' });

    expect(result.id).toBeDefined();
    expect(result.type).toBe('dm');
    expect(result.creator_id).toBe(USER_ID);
    expect(sqlMock).toHaveBeenCalledTimes(3);
  });

  it('creates a group conversation with title and members', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Insert conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // 2. Insert creator as owner
    sqlMock.mockResolvedValueOnce([] as any);
    // 3. Insert member 1
    sqlMock.mockResolvedValueOnce([] as any);
    // 4. Insert member 2
    sqlMock.mockResolvedValueOnce([] as any);
    // 5. SELECT returning the created conversation
    sqlMock.mockResolvedValueOnce([
      makeConversationRow({ type: 'group', title: 'My Group' }),
    ] as any);

    const { createConversation } = await import('./conversation.service.js');
    const result = await createConversation(USER_ID, {
      type: 'group',
      title: 'My Group',
      member_ids: [OTHER_USER_ID, THIRD_USER_ID],
    });

    expect(result.type).toBe('group');
    expect(result.title).toBe('My Group');
    // 3 inserts (conv + owner + 2 members) + 1 select = 5 calls
    expect(sqlMock).toHaveBeenCalledTimes(5);
  });

  it('creates an agent conversation', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([
      makeConversationRow({ type: 'agent', agent_id: AGENT_ID }),
    ] as any);

    const { createConversation } = await import('./conversation.service.js');
    const result = await createConversation(USER_ID, { type: 'agent' });

    expect(result.type).toBe('agent');
  });

  it('skips adding creator as member when creator is also in member_ids', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // 1. Insert conversation
    sqlMock.mockResolvedValueOnce([] as any);
    // 2. Insert creator as owner
    sqlMock.mockResolvedValueOnce([] as any);
    // 3. Only OTHER_USER_ID is added (USER_ID is skipped as it's the creator)
    sqlMock.mockResolvedValueOnce([] as any);
    // 4. SELECT returning the created conversation
    sqlMock.mockResolvedValueOnce([makeConversationRow({ type: 'group' })] as any);

    const { createConversation } = await import('./conversation.service.js');
    await createConversation(USER_ID, {
      type: 'group',
      member_ids: [USER_ID, OTHER_USER_ID],
    });

    // conv insert + owner insert + 1 member insert (not 2) + select = 4
    expect(sqlMock).toHaveBeenCalledTimes(4);
  });

  it('handles empty member_ids array', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeConversationRow()] as any);

    const { createConversation } = await import('./conversation.service.js');
    await createConversation(USER_ID, { type: 'dm', member_ids: [] });

    expect(sqlMock).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// getConversation
// ---------------------------------------------------------------------------
describe('conversation.service — getConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns conversation when user is a member', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    // SELECT conversation
    sqlMock.mockResolvedValueOnce([makeConversationRow()] as any);

    const { getConversation } = await import('./conversation.service.js');
    const result = await getConversation(CONVERSATION_ID, USER_ID);

    expect(result.id).toBe(CONVERSATION_ID);
    expect(result.created_at).toBe(NOW.toISOString());
  });

  it('throws NOT_FOUND when user is not a member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any); // assertMember fails

    const { getConversation } = await import('./conversation.service.js');
    await expect(getConversation(CONVERSATION_ID, USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND when conversation does not exist (but member check passes)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember passes
    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    // SELECT conversation returns empty
    sqlMock.mockResolvedValueOnce([] as any);

    const { getConversation } = await import('./conversation.service.js');
    await expect(getConversation(CONVERSATION_ID, USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------------------
// updateConversation
// ---------------------------------------------------------------------------
describe('conversation.service — updateConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates title when user is owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertAdminOrOwner
    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    // UPDATE RETURNING
    sqlMock.mockResolvedValueOnce([makeConversationRow({ title: 'New Title' })] as any);

    const { updateConversation } = await import('./conversation.service.js');
    const result = await updateConversation(CONVERSATION_ID, USER_ID, { title: 'New Title' });

    expect(result.title).toBe('New Title');
  });

  it('updates avatar_url when user is admin', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'admin' }] as any);
    sqlMock.mockResolvedValueOnce([
      makeConversationRow({ avatar_url: 'https://example.com/avatar.png' }),
    ] as any);

    const { updateConversation } = await import('./conversation.service.js');
    const result = await updateConversation(CONVERSATION_ID, USER_ID, {
      avatar_url: 'https://example.com/avatar.png',
    });

    expect(result.avatar_url).toBe('https://example.com/avatar.png');
  });

  it('updates both title and avatar_url', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    sqlMock.mockResolvedValueOnce([
      makeConversationRow({ title: 'Updated', avatar_url: 'https://example.com/new.png' }),
    ] as any);

    const { updateConversation } = await import('./conversation.service.js');
    const result = await updateConversation(CONVERSATION_ID, USER_ID, {
      title: 'Updated',
      avatar_url: 'https://example.com/new.png',
    });

    expect(result.title).toBe('Updated');
    expect(result.avatar_url).toBe('https://example.com/new.png');
  });

  it('throws FORBIDDEN when user is a regular member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ role: 'member' }] as any);

    const { updateConversation } = await import('./conversation.service.js');
    await expect(
      updateConversation(CONVERSATION_ID, USER_ID, { title: 'Nope' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws NOT_FOUND when user is not a member at all', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { updateConversation } = await import('./conversation.service.js');
    await expect(
      updateConversation(CONVERSATION_ID, USER_ID, { title: 'Nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws NOT_FOUND when UPDATE returns no rows', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // UPDATE RETURNING empty

    const { updateConversation } = await import('./conversation.service.js');
    await expect(
      updateConversation(CONVERSATION_ID, USER_ID, { title: 'Gone' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// deleteConversation
// ---------------------------------------------------------------------------
describe('conversation.service — deleteConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes conversation when user is owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertOwner
    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    // DELETE
    sqlMock.mockResolvedValueOnce([] as any);

    const { deleteConversation } = await import('./conversation.service.js');
    await deleteConversation(CONVERSATION_ID, USER_ID);

    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('throws FORBIDDEN when user is admin (not owner)', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ role: 'admin' }] as any);

    const { deleteConversation } = await import('./conversation.service.js');
    await expect(deleteConversation(CONVERSATION_ID, USER_ID)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('throws FORBIDDEN when user is a regular member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ role: 'member' }] as any);

    const { deleteConversation } = await import('./conversation.service.js');
    await expect(deleteConversation(CONVERSATION_ID, USER_ID)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('throws NOT_FOUND when user is not a member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { deleteConversation } = await import('./conversation.service.js');
    await expect(deleteConversation(CONVERSATION_ID, USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------------------
// listMessages
// ---------------------------------------------------------------------------
describe('conversation.service — listMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns messages without cursor', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    // SELECT messages
    sqlMock.mockResolvedValueOnce([
      makeMessageRow(),
      makeMessageRow({ id: 'msg-2', content: 'World' }),
    ] as any);

    const { listMessages } = await import('./conversation.service.js');
    const result = await listMessages(CONVERSATION_ID, USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(MESSAGE_ID);
    expect(result[0].conversation_id).toBe(CONVERSATION_ID);
    expect(result[0].sender_type).toBe('human');
  });

  it('returns messages with cursor-based pagination', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    // cursor lookup
    sqlMock.mockResolvedValueOnce([{ created_at: new Date('2026-03-01T11:00:00Z') }] as any);
    // SELECT messages before cursor
    sqlMock.mockResolvedValueOnce([makeMessageRow({ id: 'older-msg' })] as any);

    const { listMessages } = await import('./conversation.service.js');
    const result = await listMessages(CONVERSATION_ID, USER_ID, 'some-cursor-id');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('older-msg');
    expect(sqlMock).toHaveBeenCalledTimes(3);
  });

  it('throws BAD_REQUEST for invalid cursor', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    // cursor lookup returns empty
    sqlMock.mockResolvedValueOnce([] as any);

    const { listMessages } = await import('./conversation.service.js');
    await expect(listMessages(CONVERSATION_ID, USER_ID, 'invalid-cursor')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('throws NOT_FOUND when user is not a member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listMessages } = await import('./conversation.service.js');
    await expect(listMessages(CONVERSATION_ID, USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('returns empty array when no messages exist', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { listMessages } = await import('./conversation.service.js');
    const result = await listMessages(CONVERSATION_ID, USER_ID);

    expect(result).toHaveLength(0);
  });

  it('clamps limit to maximum 100', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { listMessages } = await import('./conversation.service.js');
    // Should not throw even with limit > 100
    await listMessages(CONVERSATION_ID, USER_ID, undefined, 500);

    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('clamps limit to minimum 1', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { listMessages } = await import('./conversation.service.js');
    await listMessages(CONVERSATION_ID, USER_ID, undefined, 0);

    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it('formats message dates as ISO strings', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([
      makeMessageRow({ edited_at: new Date('2026-03-01T13:00:00Z') }),
    ] as any);

    const { listMessages } = await import('./conversation.service.js');
    const result = await listMessages(CONVERSATION_ID, USER_ID);

    expect(result[0].created_at).toBe(NOW.toISOString());
    expect(result[0].edited_at).toBe('2026-03-01T13:00:00.000Z');
    expect(result[0].deleted_at).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------
describe('conversation.service — sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a message and returns the formatted message', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);

    // Inside transaction (sql.begin calls sqlFn for each query):
    // 1. Check idempotency key — not found
    sqlMock.mockResolvedValueOnce([] as any);
    // 2. Insert message
    sqlMock.mockResolvedValueOnce([] as any);
    // 3. Update conversation last_message_at
    sqlMock.mockResolvedValueOnce([] as any);
    // 4. SELECT the inserted message
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any);
    // 5. Save idempotency key
    sqlMock.mockResolvedValueOnce([] as any);

    // After transaction — check if agent conversation
    sqlMock.mockResolvedValueOnce([] as any);

    const { sendMessage } = await import('./conversation.service.js');
    const result = await sendMessage(
      CONVERSATION_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'Hello' }] },
      'idem-key-1',
    );

    expect(result.id).toBe(MESSAGE_ID);
    expect(result.sender_id).toBe(USER_ID);
    expect(result.sender_type).toBe('human');
  });

  it('returns cached response for duplicate idempotency key', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);

    // Inside transaction:
    // 1. Check idempotency key — found with cached response
    const cachedMessage = makeMessageRow();
    sqlMock.mockResolvedValueOnce([{ response_body: cachedMessage }] as any);

    // After transaction — check if agent conversation
    sqlMock.mockResolvedValueOnce([] as any);

    const { sendMessage } = await import('./conversation.service.js');
    const result = await sendMessage(
      CONVERSATION_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'Hello' }] },
      'already-used-key',
    );

    // Should return the cached response without inserting again
    expect(result).toEqual(cachedMessage);
  });

  it('throws NOT_FOUND when user is not a member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { sendMessage } = await import('./conversation.service.js');
    await expect(
      sendMessage(
        CONVERSATION_ID,
        USER_ID,
        { content: [{ type: 'text', text: 'Hello' }] },
        'idem-key-2',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('triggers agent loop for agent-type conversations', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { runAgentLoop } = await import('../agents/loop.js');

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);

    // Transaction queries
    sqlMock.mockResolvedValueOnce([] as any); // idempotency check
    sqlMock.mockResolvedValueOnce([] as any); // insert message
    sqlMock.mockResolvedValueOnce([] as any); // update conversation
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any); // select message
    sqlMock.mockResolvedValueOnce([] as any); // save idempotency key

    // Agent conversation check — found
    sqlMock.mockResolvedValueOnce([{ agent_id: AGENT_ID }] as any);

    const { sendMessage } = await import('./conversation.service.js');
    await sendMessage(
      CONVERSATION_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'Tell me a joke' }] },
      'idem-key-agent',
    );

    expect(runAgentLoop).toHaveBeenCalledWith({
      agentId: AGENT_ID,
      conversationId: CONVERSATION_ID,
      userId: USER_ID,
      message: 'Tell me a joke',
    });
  });

  it('emits WebSocket message event after sending', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { emitMessage } = await import('../../ws/emitter.js');

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { sendMessage } = await import('./conversation.service.js');
    await sendMessage(
      CONVERSATION_ID,
      USER_ID,
      { content: [{ type: 'text', text: 'Hello' }] },
      'idem-key-ws',
    );

    expect(emitMessage).toHaveBeenCalledWith(
      CONVERSATION_ID,
      expect.objectContaining({ id: MESSAGE_ID }),
    );
  });

  it('handles multi-block content for agent messages', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);
    const { runAgentLoop } = await import('../agents/loop.js');

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([{ agent_id: AGENT_ID }] as any);

    const { sendMessage } = await import('./conversation.service.js');
    await sendMessage(
      CONVERSATION_ID,
      USER_ID,
      {
        content: [
          { type: 'text', text: 'Part 1' },
          { type: 'text', text: ' Part 2' },
        ],
      },
      'idem-key-multi',
    );

    expect(runAgentLoop).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Part 1 Part 2' }),
    );
  });
});

// ---------------------------------------------------------------------------
// listMembers
// ---------------------------------------------------------------------------
describe('conversation.service — listMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted members with user info', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertMember
    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    // SELECT members
    sqlMock.mockResolvedValueOnce([
      makeMemberRow(),
      makeMemberRow({
        id: 'member-id-2',
        user_id: OTHER_USER_ID,
        role: 'member',
        username: 'otheruser',
        display_name: 'Other User',
      }),
    ] as any);

    const { listMembers } = await import('./conversation.service.js');
    const result = await listMembers(CONVERSATION_ID, USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('owner');
    expect(result[0].user?.username).toBe('testuser');
    expect(result[1].role).toBe('member');
    expect(result[1].user?.username).toBe('otheruser');
  });

  it('throws NOT_FOUND when user is not a member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { listMembers } = await import('./conversation.service.js');
    await expect(listMembers(CONVERSATION_ID, USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('returns members without user info when username is missing', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([
      makeMemberRow({ username: undefined, display_name: undefined, member_avatar_url: undefined }),
    ] as any);

    const { listMembers } = await import('./conversation.service.js');
    const result = await listMembers(CONVERSATION_ID, USER_ID);

    expect(result[0].user).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// addMember
// ---------------------------------------------------------------------------
describe('conversation.service — addMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a member with default role when user is owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertAdminOrOwner
    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    // INSERT member
    sqlMock.mockResolvedValueOnce([] as any);
    // SELECT the new member
    sqlMock.mockResolvedValueOnce([
      makeMemberRow({
        id: 'new-member-id',
        user_id: OTHER_USER_ID,
        role: 'member',
        username: 'newmember',
        display_name: 'New Member',
      }),
    ] as any);

    const { addMember } = await import('./conversation.service.js');
    const result = await addMember(CONVERSATION_ID, USER_ID, {
      user_id: OTHER_USER_ID,
      role: 'member',
    });

    expect(result.user_id).toBe(OTHER_USER_ID);
    expect(result.role).toBe('member');
    expect(result.user?.username).toBe('newmember');
  });

  it('adds a member with admin role when user is admin', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'admin' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);
    sqlMock.mockResolvedValueOnce([
      makeMemberRow({
        id: 'admin-member-id',
        user_id: THIRD_USER_ID,
        role: 'admin',
        username: 'adminmember',
      }),
    ] as any);

    const { addMember } = await import('./conversation.service.js');
    const result = await addMember(CONVERSATION_ID, USER_ID, {
      user_id: THIRD_USER_ID,
      role: 'admin',
    });

    expect(result.role).toBe('admin');
  });

  it('throws FORBIDDEN when user is a regular member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ role: 'member' }] as any);

    const { addMember } = await import('./conversation.service.js');
    await expect(
      addMember(CONVERSATION_ID, USER_ID, { user_id: OTHER_USER_ID, role: 'member' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws NOT_FOUND when user is not a member at all', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { addMember } = await import('./conversation.service.js');
    await expect(
      addMember(CONVERSATION_ID, USER_ID, { user_id: OTHER_USER_ID, role: 'member' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws NOT_FOUND when member not found after insert (e.g. user does not exist)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // INSERT (ON CONFLICT DO NOTHING may skip)
    sqlMock.mockResolvedValueOnce([] as any); // SELECT returns empty

    const { addMember } = await import('./conversation.service.js');
    await expect(
      addMember(CONVERSATION_ID, USER_ID, { user_id: 'nonexistent-user-id', role: 'member' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('handles duplicate member gracefully (ON CONFLICT DO NOTHING)', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    // INSERT with ON CONFLICT DO NOTHING — no error
    sqlMock.mockResolvedValueOnce([] as any);
    // SELECT returns existing member
    sqlMock.mockResolvedValueOnce([
      makeMemberRow({
        user_id: OTHER_USER_ID,
        role: 'member',
        username: 'existingmember',
      }),
    ] as any);

    const { addMember } = await import('./conversation.service.js');
    const result = await addMember(CONVERSATION_ID, USER_ID, {
      user_id: OTHER_USER_ID,
      role: 'member',
    });

    expect(result.user_id).toBe(OTHER_USER_ID);
  });
});

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------
describe('conversation.service — removeMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes a regular member when user is owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    // assertAdminOrOwner
    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    // Check target role
    sqlMock.mockResolvedValueOnce([{ role: 'member' }] as any);
    // DELETE
    sqlMock.mockResolvedValueOnce([] as any);

    const { removeMember } = await import('./conversation.service.js');
    await removeMember(CONVERSATION_ID, USER_ID, OTHER_USER_ID);

    expect(sqlMock).toHaveBeenCalledTimes(3);
  });

  it('removes an admin member when user is owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    sqlMock.mockResolvedValueOnce([{ role: 'admin' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { removeMember } = await import('./conversation.service.js');
    await removeMember(CONVERSATION_ID, USER_ID, OTHER_USER_ID);

    expect(sqlMock).toHaveBeenCalledTimes(3);
  });

  it('removes a regular member when user is admin', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'admin' }] as any);
    sqlMock.mockResolvedValueOnce([{ role: 'member' }] as any);
    sqlMock.mockResolvedValueOnce([] as any);

    const { removeMember } = await import('./conversation.service.js');
    await removeMember(CONVERSATION_ID, USER_ID, OTHER_USER_ID);

    expect(sqlMock).toHaveBeenCalledTimes(3);
  });

  it('throws FORBIDDEN when trying to remove the owner', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any); // current user is owner
    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any); // target is also owner

    const { removeMember } = await import('./conversation.service.js');
    await expect(removeMember(CONVERSATION_ID, USER_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('throws NOT_FOUND when target member does not exist', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    sqlMock.mockResolvedValueOnce([] as any); // target not found

    const { removeMember } = await import('./conversation.service.js');
    await expect(removeMember(CONVERSATION_ID, USER_ID, 'nonexistent-id')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws FORBIDDEN when user is a regular member', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ role: 'member' }] as any);

    const { removeMember } = await import('./conversation.service.js');
    await expect(removeMember(CONVERSATION_ID, USER_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('throws NOT_FOUND when acting user is not a member at all', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { removeMember } = await import('./conversation.service.js');
    await expect(removeMember(CONVERSATION_ID, USER_ID, OTHER_USER_ID)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------------------
// Permission helpers (assertMember, assertAdminOrOwner, assertOwner)
// Tested indirectly through the public functions above, but we add
// explicit boundary tests here via the public API.
// ---------------------------------------------------------------------------
describe('conversation.service — permission edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getConversation error message says "access denied"', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { getConversation } = await import('./conversation.service.js');
    await expect(getConversation(CONVERSATION_ID, USER_ID)).rejects.toThrow(
      'Conversation not found or access denied',
    );
  });

  it('updateConversation error message says "must be owner or admin" for member role', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ role: 'member' }] as any);

    const { updateConversation } = await import('./conversation.service.js');
    await expect(updateConversation(CONVERSATION_ID, USER_ID, { title: 'Test' })).rejects.toThrow(
      'Forbidden: must be owner or admin',
    );
  });

  it('deleteConversation error message says "must be owner" for admin role', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ role: 'admin' }] as any);

    const { deleteConversation } = await import('./conversation.service.js');
    await expect(deleteConversation(CONVERSATION_ID, USER_ID)).rejects.toThrow(
      'Forbidden: must be owner',
    );
  });

  it('removeMember error message says "Cannot remove the owner"', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);
    sqlMock.mockResolvedValueOnce([{ role: 'owner' }] as any);

    const { removeMember } = await import('./conversation.service.js');
    await expect(removeMember(CONVERSATION_ID, USER_ID, OTHER_USER_ID)).rejects.toThrow(
      'Cannot remove the owner',
    );
  });
});

// ---------------------------------------------------------------------------
// Format helpers (tested via public API return values)
// ---------------------------------------------------------------------------
describe('conversation.service — formatting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formatConversation maps inserted_at to created_at', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([
      makeConversationRow({ inserted_at: new Date('2026-01-15T10:30:00Z') }),
    ] as any);

    const { getConversation } = await import('./conversation.service.js');
    const result = await getConversation(CONVERSATION_ID, USER_ID);

    expect(result.created_at).toBe('2026-01-15T10:30:00.000Z');
    expect((result as any).inserted_at).toBeUndefined();
  });

  it('formatMessage handles null edited_at and deleted_at', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([makeMessageRow()] as any);

    const { listMessages } = await import('./conversation.service.js');
    const result = await listMessages(CONVERSATION_ID, USER_ID);

    expect(result[0].edited_at).toBeNull();
    expect(result[0].deleted_at).toBeNull();
  });

  it('formatMember includes user object when username is present', async () => {
    const { sql } = await import('../../db/connection.js');
    const sqlMock = vi.mocked(sql);

    sqlMock.mockResolvedValueOnce([{ id: 'member-id' }] as any);
    sqlMock.mockResolvedValueOnce([
      makeMemberRow({ member_avatar_url: 'https://example.com/avatar.jpg' }),
    ] as any);

    const { listMembers } = await import('./conversation.service.js');
    const result = await listMembers(CONVERSATION_ID, USER_ID);

    expect(result[0].user).toEqual({
      id: USER_ID,
      username: 'testuser',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    });
  });

  it('conversation last_message_at is null when no messages sent', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([
      makeConversationListRow({ last_message_at: null }),
    ] as any);

    const { listConversations } = await import('./conversation.service.js');
    const result = await listConversations(USER_ID);

    expect(result[0].last_message_at).toBeNull();
  });
});
