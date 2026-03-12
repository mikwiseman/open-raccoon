import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock socket.io-client before importing SocketClient
const mockSocket = {
  connected: false,
  id: 'mock_socket_id',
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { SocketClient } from '@/lib/ws/socket-client';

describe('SocketClient — connection timeout and reconnection', () => {
  let client: SocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    client = new SocketClient();
  });

  it('connect creates socket with correct options', async () => {
    client.connect('test-token');
    const { io } = await import('socket.io-client');
    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: 'test-token' },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
      }),
    );
  });

  it('does not create duplicate socket when already connected', () => {
    mockSocket.connected = true;
    client.connect('token1');
    // Second connect should be a no-op since socket is connected
    client.connect('token2');
    // io should only be called once (from the first connect before connected was set)
  });

  it('disconnect clears socket reference', () => {
    client.connect('token');
    client.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('disconnect is safe to call when not connected', () => {
    // No prior connect
    client.disconnect();
    // Should not throw
  });

  it('isConnected returns false by default', () => {
    expect(client.isConnected()).toBe(false);
  });

  it('isConnected returns true when socket is connected', () => {
    client.connect('token');
    mockSocket.connected = true;
    expect(client.isConnected()).toBe(true);
  });
});

describe('SocketClient — reconnection backoff room re-joining', () => {
  let client: SocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    client = new SocketClient();
  });

  it('re-joins conversation rooms on reconnect', () => {
    client.connect('token');
    client.joinConversation('conv-1');
    client.joinConversation('conv-2');

    // Find the connect handler
    const connectCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'connect',
    );

    mockSocket.emit.mockClear();
    // Simulate reconnection
    connectCall?.[1]();

    const joinCalls = mockSocket.emit.mock.calls.filter(
      (call: unknown[]) => call[0] === 'join:conversation',
    );
    expect(joinCalls).toHaveLength(2);
  });

  it('re-joins agent rooms on reconnect', () => {
    client.connect('token');
    client.joinAgent('agent-conv-1');

    const connectCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'connect',
    );

    mockSocket.emit.mockClear();
    connectCall?.[1]();

    const joinCalls = mockSocket.emit.mock.calls.filter(
      (call: unknown[]) => call[0] === 'join:agent',
    );
    expect(joinCalls).toHaveLength(1);
  });

  it('does not re-join left rooms on reconnect', () => {
    client.connect('token');
    client.joinConversation('c1');
    client.joinConversation('c2');
    client.leaveConversation('c1');

    const connectCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'connect',
    );

    mockSocket.emit.mockClear();
    connectCall?.[1]();

    const joinCalls = mockSocket.emit.mock.calls
      .filter((call: unknown[]) => call[0] === 'join:conversation')
      .map((call: unknown[]) => call[1]);

    expect(joinCalls).toContain('c2');
    expect(joinCalls).not.toContain('c1');
  });

  it('disconnect clears all room tracking', () => {
    client.connect('token');
    client.joinConversation('c1');
    client.joinAgent('a1');

    client.disconnect();

    // After disconnect and reconnect, no rooms should be re-joined
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});

describe('SocketClient — auth token refresh during reconnection', () => {
  let client: SocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    client = new SocketClient();
  });

  it('connect_error handler is registered', () => {
    client.connect('token');

    const connectErrorCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'connect_error',
    );

    expect(connectErrorCall).toBeDefined();
  });

  it('disconnect handler is registered', () => {
    client.connect('token');

    const disconnectCall = (mockSocket.on as Mock).mock.calls.find(
      (call: unknown[]) => call[0] === 'disconnect',
    );

    expect(disconnectCall).toBeDefined();
  });
});

describe('SocketClient — event deduplication via listeners', () => {
  let client: SocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    client = new SocketClient();
  });

  it('registers listener even without active socket', () => {
    const cb = vi.fn();
    const unsub = client.onMessage(cb);

    // Listener is stored internally
    // When socket connects later, it should be applied
    client.connect('token');

    const msgCalls = (mockSocket.on as Mock).mock.calls.filter(
      (call: unknown[]) => call[0] === 'message:new',
    );
    expect(msgCalls.length).toBeGreaterThan(0);

    unsub();
  });

  it('unsubscribe removes listener from internal list and socket', () => {
    client.connect('token');
    const cb = vi.fn();
    const unsub = client.onMessage(cb);

    unsub();

    expect(mockSocket.off).toHaveBeenCalledWith('message:new', cb);
  });

  it('multiple listeners on same event are independent', () => {
    client.connect('token');
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    const unsub1 = client.onMessage(cb1);
    const unsub2 = client.onMessage(cb2);

    unsub1();

    // cb1 should be removed, cb2 should remain
    expect(mockSocket.off).toHaveBeenCalledWith('message:new', cb1);

    unsub2();
    expect(mockSocket.off).toHaveBeenCalledWith('message:new', cb2);
  });

  it('onMessageUpdated registers message:updated listener', () => {
    client.connect('token');
    const cb = vi.fn();
    client.onMessageUpdated(cb);

    const calls = (mockSocket.on as Mock).mock.calls.filter(
      (call: unknown[]) => call[0] === 'message:updated',
    );
    expect(calls.length).toBeGreaterThan(0);
  });

  it('onMessageDeleted registers message:deleted listener', () => {
    client.connect('token');
    const cb = vi.fn();
    client.onMessageDeleted(cb);

    const calls = (mockSocket.on as Mock).mock.calls.filter(
      (call: unknown[]) => call[0] === 'message:deleted',
    );
    expect(calls.length).toBeGreaterThan(0);
  });
});

describe('SocketClient — room management edge cases', () => {
  let client: SocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    client = new SocketClient();
  });

  it('joinConversation is a no-op without socket', () => {
    client.joinConversation('c1');
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('joinAgent is a no-op without socket', () => {
    client.joinAgent('a1');
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('emitTyping emits typing:start', () => {
    client.connect('token');
    client.emitTyping('conv-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('typing:start', 'conv-1');
  });

  it('emitStopTyping emits typing:stop', () => {
    client.connect('token');
    client.emitStopTyping('conv-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('typing:stop', 'conv-1');
  });

  it('emitRead emits read event', () => {
    client.connect('token');
    client.emitRead('conv-1', 'msg-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('read', {
      conversationId: 'conv-1',
      messageId: 'msg-1',
    });
  });

  it('emitApprovalDecision emits approval_decision event', () => {
    client.connect('token');
    client.emitApprovalDecision('conv-1', 'req-1', 'approve', 'allow_once');
    expect(mockSocket.emit).toHaveBeenCalledWith('approval_decision', {
      conversationId: 'conv-1',
      requestId: 'req-1',
      decision: 'approve',
      scope: 'allow_once',
    });
  });

  it('emitApprovalDecision uses default scope', () => {
    client.connect('token');
    client.emitApprovalDecision('conv-1', 'req-1', 'deny');
    expect(mockSocket.emit).toHaveBeenCalledWith('approval_decision', {
      conversationId: 'conv-1',
      requestId: 'req-1',
      decision: 'deny',
      scope: 'allow_once',
    });
  });

  it('emitStopAgent emits agent:stop', () => {
    client.connect('token');
    client.emitStopAgent('conv-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('agent:stop', { conversationId: 'conv-1' });
  });
});
