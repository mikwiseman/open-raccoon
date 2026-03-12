import type { Server as SocketIOServer } from 'socket.io';
import { sql } from '../db/connection.js';

// userId → set of active socketIds
const presenceMap = new Map<string, Set<string>>();
// userId → pending disconnect timeout handle
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

const RECONNECT_GRACE_MS = 30_000;

/**
 * Emit a presence update only to users who share at least one conversation
 * with the given user, rather than broadcasting to every connected client.
 */
async function emitPresenceToRelatedUsers(
  io: SocketIOServer,
  userId: string,
  online: boolean,
): Promise<void> {
  try {
    // Find all users who share a conversation with this user
    const rows = await sql`
			SELECT DISTINCT cm2.user_id
			FROM conversation_members cm1
			JOIN conversation_members cm2
				ON cm2.conversation_id = cm1.conversation_id
				AND cm2.user_id != cm1.user_id
			WHERE cm1.user_id = ${userId}
		`;
    for (const row of rows as Array<Record<string, unknown>>) {
      const relatedUserId = row.user_id as string;
      io.to(`user:${relatedUserId}`).emit('presence:update', { userId, online });
    }
    // Also notify the user themselves (for multi-device sync)
    io.to(`user:${userId}`).emit('presence:update', { userId, online });
  } catch {
    // Best-effort: if DB query fails, skip presence notification
  }
}

export function addToPresence(io: SocketIOServer, userId: string, socketId: string): void {
  // Cancel pending removal if user reconnects within grace period
  const existing = disconnectTimers.get(userId);
  if (existing) {
    clearTimeout(existing);
    disconnectTimers.delete(userId);
  }

  const sockets = presenceMap.get(userId) ?? new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(socketId);
  presenceMap.set(userId, sockets);

  if (wasOffline) {
    emitPresenceToRelatedUsers(io, userId, true);
  }
}

export function removeFromPresence(io: SocketIOServer, userId: string, socketId: string): void {
  const sockets = presenceMap.get(userId);
  if (sockets) {
    sockets.delete(socketId);
  }

  // If user still has other active sockets, no need to start a disconnect timer
  if (sockets && sockets.size > 0) return;

  const timer = setTimeout(() => {
    disconnectTimers.delete(userId);

    // Re-check in case user reconnected during the grace period
    const currentSockets = presenceMap.get(userId);
    if (currentSockets && currentSockets.size > 0) return;

    presenceMap.delete(userId);
    emitPresenceToRelatedUsers(io, userId, false);
  }, RECONNECT_GRACE_MS);

  // Clear any existing timer for this user before setting a new one
  const existingTimer = disconnectTimers.get(userId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  disconnectTimers.set(userId, timer);
}

export function getOnlineUsers(): string[] {
  return Array.from(presenceMap.keys());
}

export function isUserOnline(userId: string): boolean {
  const sockets = presenceMap.get(userId);
  return sockets !== undefined && sockets.size > 0;
}
