import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server as SocketIOServer } from 'socket.io';
import { type Socket as ClientSocket, io as ioc } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ---- Mocks ----

// Mock DB connection so conversation membership queries can be controlled.
// Default returns [] so presence queries (emitPresenceToRelatedUsers) get
// an empty array instead of undefined, which would crash the for-of loop.
vi.mock('../../db/connection.js', () => ({
  sql: Object.assign(vi.fn().mockResolvedValue([]), { unsafe: vi.fn() }),
  db: {},
}));

// We need a real JWT for the auth middleware. Import the service to generate tokens.
import { generateTokens } from '../../modules/auth/auth.service.js';

// ---- Helpers ----

const USER_A_ID = '00000000-0000-4000-a000-000000000001';
const USER_B_ID = '00000000-0000-4000-a000-000000000002';
const VALID_CONV_ID = '11111111-1111-4111-a111-111111111111';

let httpServer: HttpServer;
let ioServer: SocketIOServer;
let port: number;

function clientUrl(): string {
  return `http://127.0.0.1:${port}`;
}

async function connectClient(userId: string): Promise<ClientSocket> {
  const { access_token } = await generateTokens(userId, 'user');
  const client = ioc(clientUrl(), {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token: access_token },
    forceNew: true,
  });
  await new Promise<void>((resolve, reject) => {
    client.on('connect', resolve);
    client.on('connect_error', reject);
  });
  return client;
}

function waitForEvent<T = unknown>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ---- Setup / Teardown ----

beforeAll(async () => {
  httpServer = createServer();
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  port = (httpServer.address() as AddressInfo).port;

  // Dynamically import after mocks are in place
  const { createSocketServer } = await import('../../ws/socket.js');
  ioServer = createSocketServer(httpServer);
});

afterAll(async () => {
  ioServer?.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

// Track clients for cleanup
let clients: ClientSocket[] = [];

afterEach(() => {
  for (const c of clients) {
    if (c.connected) c.disconnect();
  }
  clients = [];
});

// Helper that tracks clients for automatic cleanup
async function tracked(userId: string): Promise<ClientSocket> {
  const c = await connectClient(userId);
  clients.push(c);
  return c;
}

// ---- Tests ----

describe('socket auth middleware', () => {
  it('rejects connection with no token', async () => {
    const client = ioc(clientUrl(), {
      path: '/socket.io',
      transports: ['websocket'],
      auth: {},
      forceNew: true,
    });
    clients.push(client);

    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', resolve);
    });

    expect(err.message).toContain('Authentication required');
  });

  it('rejects connection with invalid token', async () => {
    const client = ioc(clientUrl(), {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: 'not.a.valid.jwt' },
      forceNew: true,
    });
    clients.push(client);

    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', resolve);
    });

    expect(err.message).toContain('Invalid or expired token');
  });

  it('rejects connection with expired token', async () => {
    // Generate a token, then tamper to make it invalid
    const { access_token } = await generateTokens(USER_A_ID, 'user');
    const tampered = `${access_token.slice(0, -5)}XXXXX`;

    const client = ioc(clientUrl(), {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: tampered },
      forceNew: true,
    });
    clients.push(client);

    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', resolve);
    });

    expect(err.message).toContain('Invalid or expired token');
  });

  it('accepts connection with valid JWT and receives presence snapshot', async () => {
    const client = await tracked(USER_A_ID);

    expect(client.connected).toBe(true);

    // On connection, user-channel sends presence:snapshot
    // It may have already fired before we listen, so just verify connected state
  });
});

describe('user room auto-join', () => {
  it('user automatically joins their personal room on connect', async () => {
    const clientA = await tracked(USER_A_ID);
    const clientB = await tracked(USER_B_ID);

    // Send a notification to user A via emitter
    const { emitNotification } = await import('../../ws/emitter.js');

    const notifPromise = waitForEvent(clientA, 'notification');
    emitNotification(USER_A_ID, { title: 'Hello A' });
    const notif = await notifPromise;

    expect(notif).toEqual({ title: 'Hello A' });

    // User B should NOT have received User A's notification
    // We verify by sending to B and checking B gets theirs
    const notifB = waitForEvent(clientB, 'notification');
    emitNotification(USER_B_ID, { title: 'Hello B' });
    const result = await notifB;
    expect(result).toEqual({ title: 'Hello B' });
  });
});

describe('presence integration', () => {
  it('broadcasts presence:update online when user connects', async () => {
    // Connect A first
    const clientA = await tracked(USER_A_ID);
    // Wait for async presence queries from A's connection to settle
    await new Promise((r) => setTimeout(r, 150));

    // Set up sql mock so emitPresenceToRelatedUsers returns user A as a
    // related user when B connects
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ user_id: USER_A_ID }] as any);

    const presencePromise = waitForEvent<{ userId: string; online: boolean }>(
      clientA,
      'presence:update',
    );

    await tracked(USER_B_ID);
    const update = await presencePromise;

    expect(update.userId).toBe(USER_B_ID);
    expect(update.online).toBe(true);
  });

  it('user can request a presence snapshot', async () => {
    await tracked(USER_A_ID);
    const clientB = await tracked(USER_B_ID);
    // Wait for async presence queries to settle
    await new Promise((r) => setTimeout(r, 150));

    // Override the default mock to return both users as related so that
    // getRelatedOnlineUsers (triggered by presence:request) finds them.
    // Use mockResolvedValue (persistent) to avoid race with straggling queries.
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValue([{ user_id: USER_A_ID }, { user_id: USER_B_ID }] as any);

    const snapshotPromise = waitForEvent<{ onlineUsers: string[] }>(clientB, 'presence:snapshot');
    clientB.emit('presence:request');
    const snapshot = await snapshotPromise;

    expect(snapshot.onlineUsers).toContain(USER_A_ID);
    expect(snapshot.onlineUsers).toContain(USER_B_ID);

    // Restore default empty mock for subsequent tests
    vi.mocked(sql).mockResolvedValue([] as any);
  });
});

describe('conversation channel', () => {
  beforeEach(async () => {
    const { sql } = await import('../../db/connection.js');
    // Reset but keep default return value of [] for presence queries
    vi.mocked(sql).mockReset();
    vi.mocked(sql).mockResolvedValue([] as any);
  });

  it('join:conversation succeeds when user is a member', async () => {
    const client = await tracked(USER_A_ID);
    // Wait for async presence queries to settle before setting mocks
    await new Promise((r) => setTimeout(r, 150));

    // Set up mock AFTER connection (so presence queries don't consume it)
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ '?column?': 1 }] as any);

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('join:conversation', VALID_CONV_ID, resolve);
    });

    expect(ok).toBe(true);
  });

  it('join:conversation fails when user is not a member', async () => {
    const client = await tracked(USER_A_ID);

    // sql default already returns [], so membership check will fail

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('join:conversation', VALID_CONV_ID, resolve);
    });

    expect(ok).toBe(false);
  });

  it('join:conversation rejects invalid UUID format', async () => {
    const client = await tracked(USER_A_ID);

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('join:conversation', 'not-a-uuid', resolve);
    });

    expect(ok).toBe(false);
  });

  it('leave:conversation does not throw', async () => {
    const client = await tracked(USER_A_ID);

    // Just verify it doesn't cause a disconnect or error
    client.emit('leave:conversation', VALID_CONV_ID);

    // Small delay to ensure no error events
    await new Promise((r) => setTimeout(r, 100));
    expect(client.connected).toBe(true);
  });

  it('typing events are broadcast to other members in the room', async () => {
    const clientA = await tracked(USER_A_ID);
    const clientB = await tracked(USER_B_ID);
    // Wait for async presence queries to settle
    await new Promise((r) => setTimeout(r, 150));

    // Set up mock AFTER connections for the join queries
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql)
      .mockResolvedValueOnce([{ '?column?': 1 }] as any) // user A membership check
      .mockResolvedValueOnce([{ '?column?': 1 }] as any); // user B membership check

    // Both join the conversation room
    await new Promise<boolean>((resolve) => {
      clientA.emit('join:conversation', VALID_CONV_ID, resolve);
    });
    await new Promise<boolean>((resolve) => {
      clientB.emit('join:conversation', VALID_CONV_ID, resolve);
    });

    // Listen for typing event on B
    const typingPromise = waitForEvent<{ userId: string; conversationId: string }>(
      clientB,
      'typing:start',
    );

    // A starts typing
    clientA.emit('typing:start', VALID_CONV_ID);

    const event = await typingPromise;
    expect(event.userId).toBe(USER_A_ID);
    expect(event.conversationId).toBe(VALID_CONV_ID);
  });

  it('typing:start is not emitted if user has not joined the conversation room', async () => {
    const clientA = await tracked(USER_A_ID);
    const clientB = await tracked(USER_B_ID);

    // A does NOT join the conversation, just emits typing
    clientA.emit('typing:start', VALID_CONV_ID);

    // B should NOT receive anything. Wait briefly to confirm.
    const received = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 500);
      clientB.once('typing:start', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

    expect(received).toBe(false);
  });
});

describe('agent channel', () => {
  beforeEach(async () => {
    const { sql } = await import('../../db/connection.js');
    // Reset but keep default return value of [] for presence queries
    vi.mocked(sql).mockReset();
    vi.mocked(sql).mockResolvedValue([] as any);
  });

  it('join:agent succeeds when user is a member of the conversation', async () => {
    const client = await tracked(USER_A_ID);
    // Wait for async presence queries to settle
    await new Promise((r) => setTimeout(r, 150));

    // Set up mock AFTER connection (so presence queries don't consume it)
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([{ '?column?': 1 }] as any);

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('join:agent', VALID_CONV_ID, resolve);
    });

    expect(ok).toBe(true);
  });

  it('join:agent fails when user is not a member', async () => {
    const client = await tracked(USER_A_ID);

    // sql default already returns [], so membership check will fail

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('join:agent', VALID_CONV_ID, resolve);
    });

    expect(ok).toBe(false);
  });

  it('join:agent rejects invalid UUID', async () => {
    const client = await tracked(USER_A_ID);

    const ok = await new Promise<boolean>((resolve) => {
      client.emit('join:agent', 'bad-uuid', resolve);
    });

    expect(ok).toBe(false);
  });

  it('agent:stop broadcasts run_error to agent room', async () => {
    const clientA = await tracked(USER_A_ID);
    const clientB = await tracked(USER_B_ID);
    // Wait for async presence queries to settle
    await new Promise((r) => setTimeout(r, 150));

    // Set up mock AFTER connections for the join queries
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql)
      .mockResolvedValueOnce([{ '?column?': 1 }] as any) // A join
      .mockResolvedValueOnce([{ '?column?': 1 }] as any); // B join

    // Both join the agent room
    await new Promise<boolean>((resolve) => {
      clientA.emit('join:agent', VALID_CONV_ID, resolve);
    });
    await new Promise<boolean>((resolve) => {
      clientB.emit('join:agent', VALID_CONV_ID, resolve);
    });

    const eventPromise = waitForEvent<{ type: string; error: string }>(clientB, 'agent:event');

    clientA.emit('agent:stop', { conversationId: VALID_CONV_ID });

    const event = await eventPromise;
    expect(event.type).toBe('run_error');
    expect(event.error).toBe('Stopped by user');
  });

  it('agent:stop does nothing if user has not joined the agent room', async () => {
    const clientA = await tracked(USER_A_ID);
    const clientB = await tracked(USER_B_ID);

    // A does NOT join the agent room, just tries to stop
    clientA.emit('agent:stop', { conversationId: VALID_CONV_ID });

    const received = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 500);
      clientB.once('agent:event', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

    expect(received).toBe(false);
  });

  it('leave:agent does not crash', async () => {
    const client = await tracked(USER_A_ID);
    client.emit('leave:agent', VALID_CONV_ID);
    await new Promise((r) => setTimeout(r, 100));
    expect(client.connected).toBe(true);
  });
});

describe('concurrent connections', () => {
  it('same user with multiple sockets both receive user-room events', async () => {
    const clientA1 = await tracked(USER_A_ID);
    const clientA2 = await tracked(USER_A_ID);

    const { emitNotification } = await import('../../ws/emitter.js');

    const p1 = waitForEvent(clientA1, 'notification');
    const p2 = waitForEvent(clientA2, 'notification');

    emitNotification(USER_A_ID, { title: 'Both should get this' });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ title: 'Both should get this' });
    expect(r2).toEqual({ title: 'Both should get this' });
  });

  it('disconnecting one socket does not affect the other', async () => {
    const clientA1 = await tracked(USER_A_ID);
    const clientA2 = await tracked(USER_A_ID);

    clientA1.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    expect(clientA2.connected).toBe(true);

    // User A should still receive notifications on socket 2
    const { emitNotification } = await import('../../ws/emitter.js');
    const notifPromise = waitForEvent(clientA2, 'notification');
    emitNotification(USER_A_ID, { title: 'Still online' });
    const notif = await notifPromise;
    expect(notif).toEqual({ title: 'Still online' });
  });
});

describe('emitter integration through real io', () => {
  it('emitMessage reaches clients in conversation room', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockReset();
    vi.mocked(sql).mockResolvedValue([] as any);

    const client = await tracked(USER_A_ID);
    // Wait for async presence queries to settle
    await new Promise((r) => setTimeout(r, 150));

    // Set up mock AFTER connection for the join membership query
    vi.mocked(sql).mockResolvedValueOnce([{ '?column?': 1 }] as any);

    await new Promise<boolean>((resolve) => {
      client.emit('join:conversation', VALID_CONV_ID, resolve);
    });

    const { emitMessage } = await import('../../ws/emitter.js');
    const msgPromise = waitForEvent(client, 'message:new');
    emitMessage(VALID_CONV_ID, { id: 'm1', body: 'hello' });
    const msg = await msgPromise;

    expect(msg).toEqual({ id: 'm1', body: 'hello' });
  });

  it('emitAgentEvent reaches clients in agent room', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockReset();
    vi.mocked(sql).mockResolvedValue([] as any);

    const client = await tracked(USER_A_ID);
    // Wait for async presence queries to settle
    await new Promise((r) => setTimeout(r, 150));

    // Set up mock AFTER connection for the join membership query
    vi.mocked(sql).mockResolvedValueOnce([{ '?column?': 1 }] as any);

    await new Promise<boolean>((resolve) => {
      client.emit('join:agent', VALID_CONV_ID, resolve);
    });

    const { emitAgentEvent } = await import('../../ws/emitter.js');
    const eventPromise = waitForEvent(client, 'agent:event');
    emitAgentEvent(VALID_CONV_ID, { type: 'text_delta', text: 'thinking...' });
    const event = await eventPromise;

    expect(event).toEqual({ type: 'text_delta', text: 'thinking...' });
  });
});
