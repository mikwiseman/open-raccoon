import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock socket.io-client before importing SocketClient
const mockSocket = {
  connected: false,
  id: 'mock_socket_id',
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  removeAllListeners: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { io } from 'socket.io-client';
import { SocketClient } from '../socket-client';

describe('SocketClient — additional edge cases', () => {
  let client: SocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    client = new SocketClient();
  });

  /* ---- Construction ---- */

  it('constructs without errors', () => {
    const sc = new SocketClient();
    expect(sc).toBeInstanceOf(SocketClient);
  });

  it('isConnected returns false initially', () => {
    expect(client.isConnected()).toBe(false);
  });

  /* ---- connect() ---- */

  it('creates socket with correct auth token', () => {
    client.connect('test-token-abc');

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: 'test-token-abc' },
      }),
    );
  });

  it('configures transports as websocket and polling', () => {
    client.connect('tok');

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        transports: ['websocket', 'polling'],
      }),
    );
  });

  it('enables reconnection with correct delays', () => {
    client.connect('tok');

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
      }),
    );
  });

  it('does not create new socket if already connected', () => {
    client.connect('tok1');
    mockSocket.connected = true;
    client.connect('tok2');

    expect(io).toHaveBeenCalledOnce();
  });

  it('removes all listeners from previous socket before creating new one', () => {
    // Simulate a previous disconnected socket
    client.connect('tok1');
    mockSocket.connected = false;
    mockSocket.removeAllListeners.mockClear();

    client.connect('tok2');

    expect(mockSocket.removeAllListeners).toHaveBeenCalled();
  });

  it('registers connect handler on socket', () => {
    client.connect('tok');

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('connect');
  });

  it('registers disconnect handler on socket', () => {
    client.connect('tok');

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('disconnect');
  });

  it('registers connect_error handler on socket', () => {
    client.connect('tok');

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('connect_error');
  });

  /* ---- disconnect() ---- */

  it('calls socket.disconnect() when connected', () => {
    client.connect('tok');
    client.disconnect();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('clears socket reference after disconnect', () => {
    client.connect('tok');
    client.disconnect();

    expect(client.isConnected()).toBe(false);
  });

  it('is a no-op when called without connecting first', () => {
    client.disconnect();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });

  /* ---- joinConversation ---- */

  it('emits join:conversation with conversation ID', () => {
    client.connect('tok');
    client.joinConversation('conv-123');

    expect(mockSocket.emit).toHaveBeenCalledWith('join:conversation', 'conv-123');
  });

  it('joinConversation is safe to call without socket', () => {
    // No connect() call
    client.joinConversation('conv-1');
    // Should not throw
  });

  /* ---- leaveConversation ---- */

  it('emits leave:conversation with conversation ID', () => {
    client.connect('tok');
    client.leaveConversation('conv-456');

    expect(mockSocket.emit).toHaveBeenCalledWith('leave:conversation', 'conv-456');
  });

  it('leaveConversation is safe to call without socket', () => {
    client.leaveConversation('conv-1');
    // Should not throw
  });

  /* ---- joinAgent / leaveAgent ---- */

  it('emits join:agent', () => {
    client.connect('tok');
    client.joinAgent('agent-99');

    expect(mockSocket.emit).toHaveBeenCalledWith('join:agent', 'agent-99');
  });

  it('emits leave:agent', () => {
    client.connect('tok');
    client.leaveAgent('agent-99');

    expect(mockSocket.emit).toHaveBeenCalledWith('leave:agent', 'agent-99');
  });

  /* ---- onMessage ---- */

  it('registers message:new listener on existing socket', () => {
    client.connect('tok');
    const cb = vi.fn();
    client.onMessage(cb);

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('message:new');
  });

  it('onMessage returns an unsubscribe function', () => {
    client.connect('tok');
    const cb = vi.fn();
    const unsub = client.onMessage(cb);

    unsub();

    expect(mockSocket.off).toHaveBeenCalledWith('message:new', cb);
  });

  it('registers listener even before connect', () => {
    const freshClient = new SocketClient();
    const cb = vi.fn();
    freshClient.onMessage(cb);

    vi.clearAllMocks();
    freshClient.connect('tok');

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('message:new');
  });

  /* ---- onMessageUpdated ---- */

  it('registers message:updated listener', () => {
    client.connect('tok');
    const cb = vi.fn();
    client.onMessageUpdated(cb);

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('message:updated');
  });

  /* ---- onMessageDeleted ---- */

  it('registers message:deleted listener', () => {
    client.connect('tok');
    const cb = vi.fn();
    client.onMessageDeleted(cb);

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('message:deleted');
  });

  /* ---- onTyping ---- */

  it('registers typing, typing:start, and typing:stop listeners', () => {
    client.connect('tok');
    const cb = vi.fn();
    client.onTyping(cb);

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('typing');
    expect(events).toContain('typing:start');
    expect(events).toContain('typing:stop');
  });

  it('onTyping unsubscribe removes all three listeners', () => {
    client.connect('tok');
    const cb = vi.fn();
    const unsub = client.onTyping(cb);

    unsub();

    const offEvents = (mockSocket.off as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(offEvents).toContain('typing');
    expect(offEvents).toContain('typing:start');
    expect(offEvents).toContain('typing:stop');
  });

  it('typing event defaults isTyping to true when not provided', () => {
    client.connect('tok');
    const cb = vi.fn();
    client.onTyping(cb);

    const typingCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'typing',
    );
    typingCall?.[1]({ conversationId: 'c1', userId: 'u1' });

    expect(cb).toHaveBeenCalledWith({
      conversationId: 'c1',
      userId: 'u1',
      isTyping: true,
    });
  });

  it('typing event passes explicit isTyping false', () => {
    client.connect('tok');
    const cb = vi.fn();
    client.onTyping(cb);

    const typingCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'typing',
    );
    typingCall?.[1]({ conversationId: 'c1', userId: 'u1', isTyping: false });

    expect(cb).toHaveBeenCalledWith({
      conversationId: 'c1',
      userId: 'u1',
      isTyping: false,
    });
  });

  /* ---- onAgentEvent ---- */

  it('registers agent:event listener', () => {
    client.connect('tok');
    const cb = vi.fn();
    client.onAgentEvent(cb);

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('agent:event');
  });

  /* ---- onPresence ---- */

  it('registers presence:update and presence:snapshot listeners', () => {
    client.connect('tok');
    const cb = vi.fn();
    client.onPresence(cb);

    const events = (mockSocket.on as Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain('presence:update');
    expect(events).toContain('presence:snapshot');
  });

  /* ---- Multiple event listeners ---- */

  it('supports multiple independent listeners on same event', () => {
    client.connect('tok');
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    const unsub1 = client.onMessage(cb1);
    const unsub2 = client.onMessage(cb2);

    const onCalls = (mockSocket.on as Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === 'message:new',
    );
    expect(onCalls.length).toBeGreaterThanOrEqual(2);

    unsub1();
    expect(mockSocket.off).toHaveBeenCalledWith('message:new', cb1);

    unsub2();
    expect(mockSocket.off).toHaveBeenCalledWith('message:new', cb2);
  });

  /* ---- Event listener cleanup on disconnect ---- */

  it('unsubscribe still works after disconnect (no-ops socket.off)', () => {
    client.connect('tok');
    const cb = vi.fn();
    const unsub = client.onMessage(cb);

    client.disconnect();

    // After disconnect, socket is null. Calling unsub should not throw.
    unsub();
  });

  /* ---- isConnected() ---- */

  it('returns false before connect', () => {
    expect(client.isConnected()).toBe(false);
  });

  it('returns socket.connected value after connect', () => {
    client.connect('tok');
    mockSocket.connected = false;
    expect(client.isConnected()).toBe(false);

    mockSocket.connected = true;
    expect(client.isConnected()).toBe(true);
  });

  it('returns false after disconnect', () => {
    client.connect('tok');
    mockSocket.connected = true;
    client.disconnect();

    expect(client.isConnected()).toBe(false);
  });

  /* ---- Reconnection handling ---- */

  it('re-joins conversation rooms on reconnect', () => {
    client.connect('tok');
    client.joinConversation('c1');
    client.joinConversation('c2');

    const connectCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'connect',
    );

    mockSocket.emit.mockClear();
    connectCall?.[1]();

    expect(mockSocket.emit).toHaveBeenCalledWith('join:conversation', 'c1');
    expect(mockSocket.emit).toHaveBeenCalledWith('join:conversation', 'c2');
  });

  it('re-joins agent rooms on reconnect', () => {
    client.connect('tok');
    client.joinAgent('a1');

    const connectCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'connect',
    );

    mockSocket.emit.mockClear();
    connectCall?.[1]();

    expect(mockSocket.emit).toHaveBeenCalledWith('join:agent', 'a1');
  });

  it('does not re-join left rooms on reconnect', () => {
    client.connect('tok');
    client.joinConversation('c1');
    client.leaveConversation('c1');

    const connectCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'connect',
    );

    mockSocket.emit.mockClear();
    connectCall?.[1]();

    const joinCalls = mockSocket.emit.mock.calls.filter(
      (c: unknown[]) => c[0] === 'join:conversation',
    );
    expect(joinCalls).not.toContainEqual(['join:conversation', 'c1']);
  });

  it('disconnect clears room tracking so reconnect does not re-join', () => {
    client.connect('tok');
    client.joinConversation('c1');
    client.joinAgent('a1');

    client.disconnect();

    // After disconnect, rooms should be cleared.
    // We can verify by connecting again and checking that
    // pre-connect listeners reapply but rooms don't.
    vi.clearAllMocks();
    client.connect('tok-new');

    const connectCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'connect',
    );

    mockSocket.emit.mockClear();
    connectCall?.[1]();

    // No rooms should be re-joined
    const joinConvCalls = mockSocket.emit.mock.calls.filter(
      (c: unknown[]) => c[0] === 'join:conversation',
    );
    const joinAgentCalls = mockSocket.emit.mock.calls.filter(
      (c: unknown[]) => c[0] === 'join:agent',
    );
    expect(joinConvCalls).toHaveLength(0);
    expect(joinAgentCalls).toHaveLength(0);
  });

  /* ---- Emit methods ---- */

  it('emitTyping emits typing:start', () => {
    client.connect('tok');
    client.emitTyping('conv-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('typing:start', 'conv-1');
  });

  it('emitStopTyping emits typing:stop', () => {
    client.connect('tok');
    client.emitStopTyping('conv-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('typing:stop', 'conv-1');
  });

  it('emitRead emits read with correct payload', () => {
    client.connect('tok');
    client.emitRead('conv-1', 'msg-5');
    expect(mockSocket.emit).toHaveBeenCalledWith('read', {
      conversationId: 'conv-1',
      messageId: 'msg-5',
    });
  });

  it('emitApprovalDecision emits with default scope', () => {
    client.connect('tok');
    client.emitApprovalDecision('conv-1', 'req-1', 'approve');
    expect(mockSocket.emit).toHaveBeenCalledWith('approval_decision', {
      conversationId: 'conv-1',
      requestId: 'req-1',
      decision: 'approve',
      scope: 'allow_once',
    });
  });

  it('emitApprovalDecision emits with custom scope', () => {
    client.connect('tok');
    client.emitApprovalDecision('conv-1', 'req-2', 'deny', 'allow_always');
    expect(mockSocket.emit).toHaveBeenCalledWith('approval_decision', {
      conversationId: 'conv-1',
      requestId: 'req-2',
      decision: 'deny',
      scope: 'allow_always',
    });
  });

  it('emitStopAgent emits agent:stop', () => {
    client.connect('tok');
    client.emitStopAgent('conv-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('agent:stop', {
      conversationId: 'conv-1',
    });
  });

  /* ---- Emit methods without socket ---- */

  it('emitTyping is safe without socket', () => {
    client.emitTyping('conv-1');
    // Should not throw
  });

  it('emitStopTyping is safe without socket', () => {
    client.emitStopTyping('conv-1');
    // Should not throw
  });

  it('emitRead is safe without socket', () => {
    client.emitRead('conv-1', 'msg-1');
    // Should not throw
  });

  it('emitStopAgent is safe without socket', () => {
    client.emitStopAgent('conv-1');
    // Should not throw
  });
});
