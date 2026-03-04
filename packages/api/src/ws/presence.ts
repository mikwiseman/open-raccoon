import type { Server as SocketIOServer } from 'socket.io';

// userId → set of active socketIds
const presenceMap = new Map<string, Set<string>>();
// socketId → pending disconnect timeout handle
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

const RECONNECT_GRACE_MS = 30_000;

export function addToPresence(io: SocketIOServer, userId: string, socketId: string): void {
  // Cancel pending removal if user reconnects within grace period
  const existing = disconnectTimers.get(socketId);
  if (existing) {
    clearTimeout(existing);
    disconnectTimers.delete(socketId);
  }

  const sockets = presenceMap.get(userId) ?? new Set();
  const wasOffline = sockets.size === 0;
  sockets.add(socketId);
  presenceMap.set(userId, sockets);

  if (wasOffline) {
    io.emit('presence:update', { userId, online: true });
  }
}

export function removeFromPresence(io: SocketIOServer, userId: string, socketId: string): void {
  const timer = setTimeout(() => {
    disconnectTimers.delete(socketId);

    const sockets = presenceMap.get(userId);
    if (!sockets) return;

    sockets.delete(socketId);

    if (sockets.size === 0) {
      presenceMap.delete(userId);
      io.emit('presence:update', { userId, online: false });
    }
  }, RECONNECT_GRACE_MS);

  disconnectTimers.set(socketId, timer);
}

export function getOnlineUsers(): string[] {
  return Array.from(presenceMap.keys());
}

export function isUserOnline(userId: string): boolean {
  const sockets = presenceMap.get(userId);
  return sockets !== undefined && sockets.size > 0;
}
