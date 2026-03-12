import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB connection — emitPresenceToRelatedUsers queries for related users
vi.mock('../../db/connection.js', () => {
  const sqlFn = Object.assign(vi.fn().mockResolvedValue([{ user_id: 'related-user' }]), {
    unsafe: vi.fn(),
  });
  return { sql: sqlFn, db: {} };
});

describe('presence', () => {
  let addToPresence: typeof import('../../ws/presence.js').addToPresence;
  let removeFromPresence: typeof import('../../ws/presence.js').removeFromPresence;
  let getOnlineUsers: typeof import('../../ws/presence.js').getOnlineUsers;
  let isUserOnline: typeof import('../../ws/presence.js').isUserOnline;

  let roomEmit: ReturnType<typeof vi.fn>;
  let ioTo: ReturnType<typeof vi.fn>;
  let io: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const mod = await import('../../ws/presence.js');
    addToPresence = mod.addToPresence;
    removeFromPresence = mod.removeFromPresence;
    getOnlineUsers = mod.getOnlineUsers;
    isUserOnline = mod.isUserOnline;

    roomEmit = vi.fn();
    ioTo = vi.fn().mockReturnValue({ emit: roomEmit });
    io = { to: ioTo };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------- addToPresence ----------

  describe('addToPresence', () => {
    it('marks a user online and broadcasts presence:update', async () => {
      addToPresence(io, 'user-1', 'sock-a');

      expect(isUserOnline('user-1')).toBe(true);
      expect(getOnlineUsers()).toContain('user-1');

      // emitPresenceToRelatedUsers is async — flush microtasks
      await vi.advanceTimersByTimeAsync(0);

      // Presence now emits to specific user rooms via io.to().emit()
      expect(ioTo).toHaveBeenCalledWith('user:related-user');
      expect(ioTo).toHaveBeenCalledWith('user:user-1');
      expect(roomEmit).toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: true,
      });
    });

    it('does not broadcast again for a second socket from the same user', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      await vi.advanceTimersByTimeAsync(0);
      roomEmit.mockClear();
      ioTo.mockClear();

      addToPresence(io, 'user-1', 'sock-b');
      await vi.advanceTimersByTimeAsync(0);

      // User was already online; no duplicate broadcast
      expect(roomEmit).not.toHaveBeenCalled();
      expect(isUserOnline('user-1')).toBe(true);
    });

    it('tracks multiple distinct users independently', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-2', 'sock-b');
      await vi.advanceTimersByTimeAsync(0);

      const online = getOnlineUsers();
      expect(online).toContain('user-1');
      expect(online).toContain('user-2');
      expect(online).toHaveLength(2);
    });
  });

  // ---------- removeFromPresence ----------

  describe('removeFromPresence', () => {
    it('does not mark user offline immediately (grace period)', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      await vi.advanceTimersByTimeAsync(0);
      roomEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');

      // Still considered online during grace period
      // The user has 0 sockets but the timer hasn't fired yet
      expect(roomEmit).not.toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: false,
      });
    });

    it('marks user offline after 30s grace period', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      await vi.advanceTimersByTimeAsync(0);
      roomEmit.mockClear();
      ioTo.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');
      await vi.advanceTimersByTimeAsync(30_000);

      expect(isUserOnline('user-1')).toBe(false);
      expect(getOnlineUsers()).not.toContain('user-1');
      expect(ioTo).toHaveBeenCalledWith('user:related-user');
      expect(roomEmit).toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: false,
      });
    });

    it('does not go offline if user reconnects within grace period', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      await vi.advanceTimersByTimeAsync(0);
      roomEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');

      // Reconnect before timer fires
      await vi.advanceTimersByTimeAsync(15_000);
      addToPresence(io, 'user-1', 'sock-b');
      await vi.advanceTimersByTimeAsync(0);
      roomEmit.mockClear();

      // Advance past original grace period
      await vi.advanceTimersByTimeAsync(20_000);

      // Should NOT have emitted offline
      expect(roomEmit).not.toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: false,
      });
      expect(isUserOnline('user-1')).toBe(true);
    });

    it('stays online when one of two sockets disconnects', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-1', 'sock-b');
      await vi.advanceTimersByTimeAsync(0);
      roomEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');

      // No timer should fire; user still has sock-b
      await vi.advanceTimersByTimeAsync(60_000);
      expect(isUserOnline('user-1')).toBe(true);
      expect(roomEmit).not.toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: false,
      });
    });

    it('goes offline after last socket disconnects and grace period', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-1', 'sock-b');
      await vi.advanceTimersByTimeAsync(0);
      roomEmit.mockClear();
      ioTo.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');
      removeFromPresence(io, 'user-1', 'sock-b');

      await vi.advanceTimersByTimeAsync(30_000);

      expect(isUserOnline('user-1')).toBe(false);
      expect(ioTo).toHaveBeenCalledWith('user:related-user');
      expect(roomEmit).toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: false,
      });
    });
  });

  // ---------- getOnlineUsers ----------

  describe('getOnlineUsers', () => {
    it('returns empty array when no one is connected', () => {
      expect(getOnlineUsers()).toEqual([]);
    });

    it('returns all online user ids', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-2', 'sock-b');
      addToPresence(io, 'user-3', 'sock-c');
      await vi.advanceTimersByTimeAsync(0);

      const online = getOnlineUsers();
      expect(online).toHaveLength(3);
      expect(online.sort()).toEqual(['user-1', 'user-2', 'user-3']);
    });
  });

  // ---------- isUserOnline ----------

  describe('isUserOnline', () => {
    it('returns false for unknown user', () => {
      expect(isUserOnline('no-such-user')).toBe(false);
    });

    it('returns true when user has at least one socket', () => {
      addToPresence(io, 'user-1', 'sock-a');
      expect(isUserOnline('user-1')).toBe(true);
    });
  });

  // ---------- edge cases ----------

  describe('edge cases', () => {
    it('removing a socketId that was never added does not crash', () => {
      expect(() => removeFromPresence(io, 'user-1', 'nonexistent-sock')).not.toThrow();
    });

    it('removing from unknown user does not crash', () => {
      expect(() => removeFromPresence(io, 'ghost', 'sock-x')).not.toThrow();
    });

    it('rapid connect/disconnect/reconnect settles correctly', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      removeFromPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-1', 'sock-b');
      removeFromPresence(io, 'user-1', 'sock-b');
      addToPresence(io, 'user-1', 'sock-c');

      await vi.advanceTimersByTimeAsync(60_000);

      // Should be online with sock-c
      expect(isUserOnline('user-1')).toBe(true);
    });

    it('concurrent users going offline independently', async () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-2', 'sock-b');
      await vi.advanceTimersByTimeAsync(0);
      roomEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');
      await vi.advanceTimersByTimeAsync(30_000);

      expect(isUserOnline('user-1')).toBe(false);
      expect(isUserOnline('user-2')).toBe(true);

      removeFromPresence(io, 'user-2', 'sock-b');
      await vi.advanceTimersByTimeAsync(30_000);

      expect(isUserOnline('user-2')).toBe(false);
    });
  });
});
