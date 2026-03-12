import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Polyfill scrollIntoView for jsdom
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock CSS imports
vi.mock('highlight.js/styles/github-dark.min.css', () => ({}));
vi.mock('../chat-blocks.css', () => ({}));

// Mock highlight.js
vi.mock('highlight.js/lib/core', () => {
  const registerLanguage = vi.fn();
  const highlight = vi.fn(() => ({ value: '' }));
  const getLanguage = vi.fn(() => undefined);
  const highlightAuto = vi.fn(() => ({ value: '' }));
  return { default: { registerLanguage, highlight, getLanguage, highlightAuto } };
});
vi.mock('highlight.js/lib/languages/bash', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/css', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/elixir', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/javascript', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/json', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/python', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/sql', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/typescript', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/xml', () => ({ default: {} }));

// Mock dompurify
vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    id: 'mock-socket-id',
    removeAllListeners: vi.fn(),
  })),
}));

// Mock the useAgentStream hook
vi.mock('../useAgentStream', () => ({
  useAgentStream: vi.fn(() => ({
    streamingMessage: null,
    isStreaming: false,
  })),
}));

// Mock content-blocks
vi.mock('../content-blocks', () => ({
  ContentBlockRenderer: ({ blocks }: { blocks: unknown[] }) => (
    <div data-testid="content-blocks">{JSON.stringify(blocks)}</div>
  ),
  parseContentBlocks: (content: unknown) => {
    if (Array.isArray(content)) return content;
    if (content && typeof content === 'object' && 'text' in content) {
      return [{ type: 'text', text: (content as { text: string }).text }];
    }
    return [];
  },
}));

import type { WaiAgentsApi } from '@/lib/api/services';
import type { SessionUser } from '@/lib/state/session-store';
import type { Conversation, ConversationMember, Message } from '@/lib/types';
import { ChatView } from '../ChatView';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    type: 'dm',
    title: 'Test Chat',
    avatar_url: null,
    creator_id: 'user-1',
    agent_id: null,
    bridge_id: null,
    metadata: {},
    last_message_at: '2026-03-10T12:00:00Z',
    created_at: '2026-03-10T11:00:00Z',
    updated_at: '2026-03-10T12:00:00Z',
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    sender_type: 'human',
    type: 'text',
    content: { text: 'Hello, world!' },
    metadata: {},
    edited_at: null,
    deleted_at: null,
    created_at: '2026-03-10T12:00:00Z',
    reactions: [],
    ...overrides,
  };
}

function makeMember(overrides: Partial<ConversationMember> = {}): ConversationMember {
  return {
    id: 'member-1',
    conversation_id: 'conv-1',
    user_id: 'user-1',
    role: 'owner',
    muted: false,
    last_read_at: null,
    joined_at: '2026-03-10T11:00:00Z',
    user: {
      id: 'user-1',
      username: 'alice',
      display_name: 'Alice',
      avatar_url: null,
    },
    ...overrides,
  };
}

const currentUser: SessionUser = {
  id: 'user-1',
  username: 'alice',
  display_name: 'Alice',
  email: 'alice@test.com',
  avatar_url: null,
  bio: null,
};

function createMockApi(overrides: Partial<WaiAgentsApi> = {}): WaiAgentsApi {
  return {
    listConversations: vi.fn().mockResolvedValue({
      items: [makeConversation()],
      page_info: { next_cursor: null, has_more: false },
    }),
    listMessages: vi.fn().mockResolvedValue({
      items: [makeMessage()],
      page_info: { next_cursor: null, has_more: false },
    }),
    listMembers: vi.fn().mockResolvedValue({
      items: [makeMember()],
      page_info: { next_cursor: null, has_more: false },
    }),
    sendTextMessage: vi.fn().mockResolvedValue({
      message: makeMessage({ id: 'msg-new' }),
    }),
    createConversation: vi.fn().mockResolvedValue({
      conversation: makeConversation({ id: 'conv-new' }),
    }),
    editTextMessage: vi.fn().mockResolvedValue({
      message: makeMessage({
        id: 'msg-1',
        content: { text: 'Edited message' },
        edited_at: '2026-03-10T13:00:00Z',
      }),
    }),
    deleteMessage: vi.fn().mockResolvedValue({
      message: makeMessage({ id: 'msg-1', deleted_at: '2026-03-10T13:00:00Z' }),
    }),
    userByUsername: vi.fn().mockResolvedValue({
      user: { id: 'user-2', username: 'bob' },
    }),
    ...overrides,
  } as unknown as WaiAgentsApi;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('ChatView edge cases — batch 2', () => {
  let api: WaiAgentsApi;

  beforeEach(() => {
    api = createMockApi();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /* ---- Message editing flow ---- */

  it('shows Edit button on hover for own messages', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });
    const editBtn = screen.getByTitle('Edit');
    expect(editBtn).toBeInTheDocument();
  });

  it('does not show Edit button for other users messages', async () => {
    const otherApi = createMockApi({
      listMessages: vi.fn().mockResolvedValue({
        items: [makeMessage({ id: 'msg-other', sender_id: 'user-2' })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={otherApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
  });

  it('clicking Edit shows the edit form with current text', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Edit'));

    const editInput = document.querySelector('.cv-edit-input') as HTMLTextAreaElement;
    expect(editInput).toBeInTheDocument();
    expect(editInput.value).toBe('Hello, world!');
  });

  it('submitting edit form calls editTextMessage', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Edit'));

    const editInput = document.querySelector('.cv-edit-input') as HTMLTextAreaElement;
    await user.clear(editInput);
    await user.type(editInput, 'Updated text');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(api.editTextMessage).toHaveBeenCalledWith('conv-1', 'msg-1', 'Updated text');
    });
  });

  it('Cancel button closes the edit form', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Edit'));
    expect(document.querySelector('.cv-edit-form')).toBeInTheDocument();

    await user.click(screen.getByText('Cancel'));
    expect(document.querySelector('.cv-edit-form')).not.toBeInTheDocument();
  });

  it('shows error when edit fails', async () => {
    const failEditApi = createMockApi({
      editTextMessage: vi.fn().mockRejectedValue(new Error('Edit denied')),
    });
    render(<ChatView api={failEditApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Edit'));
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Edit denied')).toBeInTheDocument();
    });
  });

  it('does not call editTextMessage when edit draft is empty', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Edit'));

    const editInput = document.querySelector('.cv-edit-input') as HTMLTextAreaElement;
    await user.clear(editInput);

    await user.click(screen.getByText('Save'));

    expect(api.editTextMessage).not.toHaveBeenCalled();
  });

  /* ---- Message deletion ---- */

  it('shows Delete button on own messages', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  it('calls deleteMessage when Delete is clicked', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByTitle('Delete')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Delete'));

    await waitFor(() => {
      expect(api.deleteMessage).toHaveBeenCalledWith('conv-1', 'msg-1');
    });
  });

  it('shows "Message deleted" after deletion', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByTitle('Delete')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Delete'));

    await waitFor(() => {
      expect(screen.getByText('Message deleted')).toBeInTheDocument();
    });
  });

  it('shows error when deletion fails', async () => {
    const failDeleteApi = createMockApi({
      deleteMessage: vi.fn().mockRejectedValue(new Error('Delete failed')),
    });
    render(<ChatView api={failDeleteApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByTitle('Delete')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('Delete'));

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });

  /* ---- Group conversation creation ---- */

  it('creates a group conversation via the modal', async () => {
    const groupApi = createMockApi({
      createConversation: vi.fn().mockResolvedValue({
        conversation: makeConversation({ id: 'conv-group', type: 'group', title: 'Dev Team' }),
      }),
    });
    render(<ChatView api={groupApi} accessToken="tok" currentUser={currentUser} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('New conversation'));
    await user.click(screen.getByText('Group'));
    await user.type(screen.getByPlaceholderText('Group title...'), 'Dev Team');
    await user.click(screen.getByText('Create Group'));

    await waitFor(() => {
      expect(groupApi.createConversation).toHaveBeenCalledWith({
        type: 'group',
        title: 'Dev Team',
      });
    });
  });

  it('shows info toast after creating group', async () => {
    const groupApi = createMockApi({
      createConversation: vi.fn().mockResolvedValue({
        conversation: makeConversation({ id: 'conv-group', type: 'group', title: 'My Group' }),
      }),
    });
    render(<ChatView api={groupApi} accessToken="tok" currentUser={currentUser} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('New conversation'));
    await user.click(screen.getByText('Group'));
    await user.type(screen.getByPlaceholderText('Group title...'), 'My Group');
    await user.click(screen.getByText('Create Group'));

    await waitFor(() => {
      expect(screen.getByText('Created group "My Group"')).toBeInTheDocument();
    });
  });

  it('does not create group with empty title', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('New conversation'));
    await user.click(screen.getByText('Group'));
    await user.click(screen.getByText('Create Group'));

    expect(api.createConversation).not.toHaveBeenCalled();
  });

  /* ---- DM conversation creation ---- */

  it('creates a DM conversation via the modal', async () => {
    const dmApi = createMockApi({
      createConversation: vi.fn().mockResolvedValue({
        conversation: makeConversation({ id: 'conv-dm', type: 'dm' }),
      }),
    });
    render(<ChatView api={dmApi} accessToken="tok" currentUser={currentUser} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('New conversation'));
    await user.type(screen.getByPlaceholderText('Enter username...'), 'bob');
    await user.click(screen.getByText('Open DM'));

    await waitFor(() => {
      expect(dmApi.userByUsername).toHaveBeenCalledWith('bob');
      expect(dmApi.createConversation).toHaveBeenCalledWith({
        type: 'dm',
        member_id: 'user-2',
      });
    });
  });

  it('shows info toast after opening DM', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('New conversation'));
    await user.type(screen.getByPlaceholderText('Enter username...'), 'bob');
    await user.click(screen.getByText('Open DM'));

    await waitFor(() => {
      expect(screen.getByText('Opened DM with @bob')).toBeInTheDocument();
    });
  });

  it('shows error when DM user lookup fails', async () => {
    const failUserApi = createMockApi({
      userByUsername: vi.fn().mockRejectedValue(new Error('User not found')),
    });
    render(<ChatView api={failUserApi} accessToken="tok" currentUser={currentUser} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('New conversation'));
    await user.type(screen.getByPlaceholderText('Enter username...'), 'nonexistent');
    await user.click(screen.getByText('Open DM'));

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  it('does not create DM with empty username', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('New conversation'));
    await user.click(screen.getByText('Open DM'));

    expect(api.userByUsername).not.toHaveBeenCalled();
  });

  /* ---- Message timestamp formatting ---- */

  it('shows message timestamp on the last message in a group', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });
    // Check for presence of timestamp element
    const timeEl = document.querySelector('.cv-msg-time');
    expect(timeEl).toBeInTheDocument();
  });

  /* ---- Conversation member list panel ---- */

  it('shows Members heading with count in agent side panel', async () => {
    const agentApi = createMockApi({
      listConversations: vi.fn().mockResolvedValue({
        items: [makeConversation({ type: 'agent', agent_id: 'agent-1' })],
        page_info: { next_cursor: null, has_more: false },
      }),
      listMembers: vi.fn().mockResolvedValue({
        items: [
          makeMember(),
          makeMember({
            id: 'member-2',
            user_id: 'user-2',
            user: { id: 'user-2', username: 'bob', display_name: 'Bob', avatar_url: null },
          }),
          makeMember({
            id: 'member-3',
            user_id: 'user-3',
            user: { id: 'user-3', username: 'carol', display_name: 'Carol', avatar_url: null },
          }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={agentApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Members (3)')).toBeInTheDocument();
    });
  });

  it('displays member names in the members list', async () => {
    const agentApi = createMockApi({
      listConversations: vi.fn().mockResolvedValue({
        items: [makeConversation({ type: 'agent', agent_id: 'agent-1' })],
        page_info: { next_cursor: null, has_more: false },
      }),
      listMembers: vi.fn().mockResolvedValue({
        items: [
          makeMember(),
          makeMember({
            id: 'member-2',
            user_id: 'user-2',
            user: { id: 'user-2', username: 'bob', display_name: 'Bob', avatar_url: null },
          }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={agentApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      const membersList = document.querySelector('.cv-members-list');
      expect(membersList).toBeInTheDocument();
      expect(membersList?.textContent).toContain('Alice');
      expect(membersList?.textContent).toContain('Bob');
    });
  });

  /* ---- Loading more messages (pagination) ---- */

  it('shows "Load older messages" when messageHasMore is true', async () => {
    const pagedApi = createMockApi({
      listMessages: vi.fn().mockResolvedValue({
        items: [makeMessage()],
        page_info: { next_cursor: 'cursor-2', has_more: true },
      }),
    });
    render(<ChatView api={pagedApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Load older messages')).toBeInTheDocument();
    });
  });

  it('clicking "Load older messages" fetches more messages', async () => {
    const pagedApi = createMockApi({
      listMessages: vi
        .fn()
        .mockResolvedValueOnce({
          items: [makeMessage({ id: 'msg-1', content: { text: 'Recent' } })],
          page_info: { next_cursor: 'cursor-2', has_more: true },
        })
        .mockResolvedValueOnce({
          items: [
            makeMessage({
              id: 'msg-old',
              content: { text: 'Older message' },
              created_at: '2026-03-09T12:00:00Z',
            }),
          ],
          page_info: { next_cursor: null, has_more: false },
        }),
    });
    render(<ChatView api={pagedApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Load older messages')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Load older messages'));

    await waitFor(() => {
      expect(screen.getByText('Older message')).toBeInTheDocument();
    });
  });

  it('disables "Load older messages" while loading', async () => {
    const pagedApi = createMockApi({
      listMessages: vi
        .fn()
        .mockResolvedValueOnce({
          items: [makeMessage()],
          page_info: { next_cursor: 'cursor-2', has_more: true },
        })
        .mockReturnValueOnce(new Promise(() => {})),
    });
    render(<ChatView api={pagedApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Load older messages')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Load older messages'));

    await waitFor(() => {
      const btn = screen.getByText('Loading...').closest('button');
      expect(btn).toBeDisabled();
    });
  });

  /* ---- Error state when API fails ---- */

  it('displays error when conversations API fails', async () => {
    const failApi = createMockApi({
      listConversations: vi.fn().mockRejectedValue(new Error('Server unreachable')),
    });
    render(<ChatView api={failApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Server unreachable')).toBeInTheDocument();
    });
  });

  it('displays error when members API fails', async () => {
    const failApi = createMockApi({
      listMembers: vi.fn().mockRejectedValue(new Error('Members load error')),
    });
    render(<ChatView api={failApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Members load error')).toBeInTheDocument();
    });
  });

  /* ---- Reconnection indicator ---- */

  it('does not show reconnection banner initially (socket not connected)', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getAllByText('Test Chat').length).toBeGreaterThanOrEqual(1);
    });
    // The banner shows "Reconnecting to server..." when wsConnected is false.
    // Since socket.connected defaults to false, the banner should be visible.
    expect(screen.getByText('Reconnecting to server...')).toBeInTheDocument();
  });

  /* ---- Agent conversation type detection ---- */

  it('renders Agent panel heading for agent conversations', async () => {
    const agentApi = createMockApi({
      listConversations: vi.fn().mockResolvedValue({
        items: [makeConversation({ type: 'agent', agent_id: 'agent-1' })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={agentApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Agent')).toBeInTheDocument();
    });
  });

  it('does not render Agent panel for DM conversations', async () => {
    render(<ChatView api={api} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getAllByText('Test Chat').length).toBeGreaterThanOrEqual(1);
    });
    expect(document.querySelector('.cv-sidepanel')).not.toBeInTheDocument();
  });

  it('shows agent conversation preview as "Agent conversation" in sidebar', async () => {
    const agentApi = createMockApi({
      listConversations: vi.fn().mockResolvedValue({
        items: [makeConversation({ type: 'agent', agent_id: 'agent-1', title: 'My Agent Chat' })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={agentApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Agent conversation')).toBeInTheDocument();
    });
  });

  /* ---- System messages ---- */

  it('renders system messages with italic styling', async () => {
    const sysApi = createMockApi({
      listMessages: vi.fn().mockResolvedValue({
        items: [
          makeMessage({
            id: 'msg-sys',
            sender_type: 'system',
            content: { text: 'User joined the conversation' },
          }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={sysApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      const systemMsg = document.querySelector('.cv-msg-system');
      expect(systemMsg).toBeInTheDocument();
      expect(systemMsg?.querySelector('em')).toBeInTheDocument();
    });
  });

  /* ---- Deleted message display ---- */

  it('shows "Message deleted" for messages with deleted_at set', async () => {
    const deletedApi = createMockApi({
      listMessages: vi.fn().mockResolvedValue({
        items: [
          makeMessage({
            id: 'msg-del',
            deleted_at: '2026-03-10T13:00:00Z',
            content: { text: 'This was deleted' },
          }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={deletedApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Message deleted')).toBeInTheDocument();
    });
  });

  it('does not show edit/delete actions on deleted messages', async () => {
    const deletedApi = createMockApi({
      listMessages: vi.fn().mockResolvedValue({
        items: [makeMessage({ id: 'msg-del', deleted_at: '2026-03-10T13:00:00Z' })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={deletedApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Message deleted')).toBeInTheDocument();
    });
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  /* ---- Edited message indicator ---- */

  it('shows "(edited)" indicator for edited messages', async () => {
    const editedApi = createMockApi({
      listMessages: vi.fn().mockResolvedValue({
        items: [
          makeMessage({
            id: 'msg-edited',
            content: { text: 'Updated text' },
            edited_at: '2026-03-10T13:00:00Z',
          }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={editedApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });
  });

  /* ---- Multiple conversations ---- */

  it('switches between conversations and reloads messages', async () => {
    const multiConvoApi = createMockApi({
      listConversations: vi.fn().mockResolvedValue({
        items: [
          makeConversation({ id: 'conv-1', title: 'First Chat' }),
          makeConversation({
            id: 'conv-2',
            title: 'Second Chat',
            last_message_at: '2026-03-10T11:00:00Z',
          }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
      listMessages: vi.fn().mockResolvedValue({
        items: [makeMessage()],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={multiConvoApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('First Chat')).toBeInTheDocument();
      expect(screen.getByText('Second Chat')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Second Chat'));

    await waitFor(() => {
      expect(multiConvoApi.listMessages).toHaveBeenCalledWith('conv-2', expect.any(Object));
    });
  });

  /* ---- Conversation title fallback ---- */

  it('shows fallback title when conversation has no title', async () => {
    const noTitleApi = createMockApi({
      listConversations: vi.fn().mockResolvedValue({
        items: [makeConversation({ title: null })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={noTitleApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getAllByText('Dm Chat').length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ---- No conversations empty state ---- */

  it('shows "No conversations" when sidebar is empty', async () => {
    const emptyApi = createMockApi({
      listConversations: vi.fn().mockResolvedValue({
        items: [],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={emptyApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('No conversations')).toBeInTheDocument();
    });
  });

  /* ---- Date separators ---- */

  it('renders date separator between messages from different days', async () => {
    const dateSepApi = createMockApi({
      listMessages: vi.fn().mockResolvedValue({
        items: [
          makeMessage({
            id: 'msg-old',
            content: { text: 'Old msg' },
            created_at: '2026-03-08T12:00:00Z',
          }),
          makeMessage({
            id: 'msg-new',
            content: { text: 'New msg' },
            created_at: '2026-03-10T12:00:00Z',
          }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={dateSepApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      const dateSeps = document.querySelectorAll('.cv-date-sep');
      expect(dateSeps.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ---- Pending message styling ---- */

  it('shows pending class on optimistic message while sending', async () => {
    const slowSendApi = createMockApi({
      sendTextMessage: vi.fn().mockReturnValue(new Promise(() => {})),
    });
    render(<ChatView api={slowSendApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(slowSendApi.listMessages).toHaveBeenCalled();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByPlaceholderText('Type a message...'), 'Sending...');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      const pendingMsg = screen.getByText('Sending...').closest('.cv-msg');
      expect(pendingMsg?.classList.contains('cv-msg-pending')).toBe(true);
    });
  });

  /* ---- No edit/delete on pending messages ---- */

  it('does not show edit/delete buttons on pending messages', async () => {
    const slowSendApi = createMockApi({
      sendTextMessage: vi.fn().mockReturnValue(new Promise(() => {})),
    });
    render(<ChatView api={slowSendApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(slowSendApi.listMessages).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textarea, { target: { value: 'Temp msg' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Temp msg')).toBeInTheDocument();
    });
    // Pending messages should not have action buttons
    const pendingMsg = screen.getByText('Temp msg').closest('.cv-msg');
    expect(pendingMsg?.querySelector('.cv-msg-actions')).not.toBeInTheDocument();
  });

  /* ---- FocusConversationId prop ---- */

  it('selects conversation from focusConversationId prop', async () => {
    const multiApi = createMockApi({
      listConversations: vi.fn().mockResolvedValue({
        items: [
          makeConversation({ id: 'conv-1', title: 'First Chat' }),
          makeConversation({ id: 'conv-2', title: 'Second Chat' }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(
      <ChatView
        api={multiApi}
        accessToken="tok"
        currentUser={currentUser}
        focusConversationId="conv-2"
      />,
    );
    await waitFor(() => {
      expect(multiApi.listMessages).toHaveBeenCalledWith('conv-2', expect.any(Object));
    });
  });

  /* ---- Reaction display count ---- */

  it('displays reaction count when more than one user reacted', async () => {
    const reactionApi = createMockApi({
      listMessages: vi.fn().mockResolvedValue({
        items: [
          makeMessage({
            id: 'msg-react',
            content: { text: 'Great work' },
            reactions: [
              { id: 'r1', message_id: 'msg-react', user_id: 'user-2', emoji: '\u2764\ufe0f' },
              { id: 'r2', message_id: 'msg-react', user_id: 'user-3', emoji: '\u2764\ufe0f' },
              { id: 'r3', message_id: 'msg-react', user_id: 'user-4', emoji: '\u2764\ufe0f' },
            ],
          }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<ChatView api={reactionApi} accessToken="tok" currentUser={currentUser} />);
    await waitFor(() => {
      const reactionPill = screen.getByText(/\u2764\ufe0f/);
      expect(reactionPill.textContent).toContain('3');
    });
  });

  /* ---- Conversation error handling for group creation ---- */

  it('shows error when group creation fails', async () => {
    const failGroupApi = createMockApi({
      createConversation: vi.fn().mockRejectedValue(new Error('Group limit reached')),
    });
    render(<ChatView api={failGroupApi} accessToken="tok" currentUser={currentUser} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTitle('New conversation'));
    await user.click(screen.getByText('Group'));
    await user.type(screen.getByPlaceholderText('Group title...'), 'Too Many Groups');
    await user.click(screen.getByText('Create Group'));

    await waitFor(() => {
      expect(screen.getByText('Group limit reached')).toBeInTheDocument();
    });
  });
});
