import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB connection (transitive import guard)
vi.mock('../../db/connection.js', () => ({
  sql: Object.assign(vi.fn(), { unsafe: vi.fn() }),
  db: {},
}));

describe('presence', () => {
  let addToPresence: typeof import('../../ws/presence.js').addToPresence;
  let removeFromPresence: typeof import('../../ws/presence.js').removeFromPresence;
  let getOnlineUsers: typeof import('../../ws/presence.js').getOnlineUsers;
  let isUserOnline: typeof import('../../ws/presence.js').isUserOnline;

  let ioEmit: ReturnType<typeof vi.fn>;
  let io: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();

    const mod = await import('../../ws/presence.js');
    addToPresence = mod.addToPresence;
    removeFromPresence = mod.removeFromPresence;
    getOnlineUsers = mod.getOnlineUsers;
    isUserOnline = mod.isUserOnline;

    ioEmit = vi.fn();
    io = { emit: ioEmit };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------- addToPresence ----------

  describe('addToPresence', () => {
    it('marks a user online and broadcasts presence:update', () => {
      addToPresence(io, 'user-1', 'sock-a');

      expect(isUserOnline('user-1')).toBe(true);
      expect(getOnlineUsers()).toContain('user-1');
      expect(ioEmit).toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: true,
      });
    });

    it('does not broadcast again for a second socket from the same user', () => {
      addToPresence(io, 'user-1', 'sock-a');
      ioEmit.mockClear();

      addToPresence(io, 'user-1', 'sock-b');

      // User was already online; no duplicate broadcast
      expect(ioEmit).not.toHaveBeenCalled();
      expect(isUserOnline('user-1')).toBe(true);
    });

    it('tracks multiple distinct users independently', () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-2', 'sock-b');

      const online = getOnlineUsers();
      expect(online).toContain('user-1');
      expect(online).toContain('user-2');
      expect(online).toHaveLength(2);
    });
  });

  // ---------- removeFromPresence ----------

  describe('removeFromPresence', () => {
    it('does not mark user offline immediately (grace period)', () => {
      addToPresence(io, 'user-1', 'sock-a');
      ioEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');

      // Still considered online during grace period
      // The user has 0 sockets but the timer hasn't fired yet
      // getOnlineUsers is based on presenceMap which still has the entry
      expect(ioEmit).not.toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: false,
      });
    });

    it('marks user offline after 30s grace period', () => {
      addToPresence(io, 'user-1', 'sock-a');
      ioEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');
      vi.advanceTimersByTime(30_000);

      expect(isUserOnline('user-1')).toBe(false);
      expect(getOnlineUsers()).not.toContain('user-1');
      expect(ioEmit).toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: false,
      });
    });

    it('does not go offline if user reconnects within grace period', () => {
      addToPresence(io, 'user-1', 'sock-a');
      ioEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');

      // Reconnect before timer fires
      vi.advanceTimersByTime(15_000);
      addToPresence(io, 'user-1', 'sock-b');
      ioEmit.mockClear();

      // Advance past original grace period
      vi.advanceTimersByTime(20_000);

      // Should NOT have emitted offline
      expect(ioEmit).not.toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: false,
      });
      expect(isUserOnline('user-1')).toBe(true);
    });

    it('stays online when one of two sockets disconnects', () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-1', 'sock-b');
      ioEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');

      // No timer should fire; user still has sock-b
      vi.advanceTimersByTime(60_000);
      expect(isUserOnline('user-1')).toBe(true);
      expect(ioEmit).not.toHaveBeenCalledWith('presence:update', {
        userId: 'user-1',
        online: false,
      });
    });

    it('goes offline after last socket disconnects and grace period', () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-1', 'sock-b');
      ioEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');
      removeFromPresence(io, 'user-1', 'sock-b');

      vi.advanceTimersByTime(30_000);

      expect(isUserOnline('user-1')).toBe(false);
      expect(ioEmit).toHaveBeenCalledWith('presence:update', {
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

    it('returns all online user ids', () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-2', 'sock-b');
      addToPresence(io, 'user-3', 'sock-c');

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

    it('rapid connect/disconnect/reconnect settles correctly', () => {
      addToPresence(io, 'user-1', 'sock-a');
      removeFromPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-1', 'sock-b');
      removeFromPresence(io, 'user-1', 'sock-b');
      addToPresence(io, 'user-1', 'sock-c');

      vi.advanceTimersByTime(60_000);

      // Should be online with sock-c
      expect(isUserOnline('user-1')).toBe(true);
    });

    it('concurrent users going offline independently', () => {
      addToPresence(io, 'user-1', 'sock-a');
      addToPresence(io, 'user-2', 'sock-b');
      ioEmit.mockClear();

      removeFromPresence(io, 'user-1', 'sock-a');
      vi.advanceTimersByTime(30_000);

      expect(isUserOnline('user-1')).toBe(false);
      expect(isUserOnline('user-2')).toBe(true);

      removeFromPresence(io, 'user-2', 'sock-b');
      vi.advanceTimersByTime(30_000);

      expect(isUserOnline('user-2')).toBe(false);
    });
  });
});
