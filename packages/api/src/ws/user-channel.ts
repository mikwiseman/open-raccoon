import type { Server as SocketIOServer } from 'socket.io';
import { getOnlineUsers } from './presence.js';

export function setupUserHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    const _userId = socket.data.userId as string;

    // Send current online users to newly connected client
    socket.emit('presence:snapshot', { onlineUsers: getOnlineUsers() });

    // Clients can request a fresh presence snapshot at any time
    socket.on('presence:request', () => {
      socket.emit('presence:snapshot', { onlineUsers: getOnlineUsers() });
    });
  });
}

// Outbound events sent to user:{userId} room via emitter.ts:
//   emitNotification(userId, notification)
//   emitConversationUpdated(userId, conversation)
// Broadcast presence:update emitted from presence.ts on connect/disconnect
