import type { Server as SocketIOServer } from 'socket.io';
import { sql } from '../db/connection.js';
import { isUserOnline } from './presence.js';

/**
 * Return online status only for users who share a conversation with the
 * requesting user, preventing information leakage about unrelated users.
 */
async function getRelatedOnlineUsers(userId: string): Promise<string[]> {
  try {
    const rows = await sql`
			SELECT DISTINCT cm2.user_id
			FROM conversation_members cm1
			JOIN conversation_members cm2
				ON cm2.conversation_id = cm1.conversation_id
				AND cm2.user_id != cm1.user_id
			WHERE cm1.user_id = ${userId}
		`;
    const relatedIds = (rows as Array<Record<string, unknown>>).map((r) => r.user_id as string);
    return relatedIds.filter((id) => isUserOnline(id));
  } catch {
    // Best-effort: on failure return empty list
    return [];
  }
}

export function setupUserHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    // Send current online users (scoped to related users) to newly connected client
    getRelatedOnlineUsers(userId).then((onlineUsers) => {
      socket.emit('presence:snapshot', { onlineUsers });
    });

    // Clients can request a fresh presence snapshot at any time
    socket.on('presence:request', () => {
      getRelatedOnlineUsers(userId).then((onlineUsers) => {
        socket.emit('presence:snapshot', { onlineUsers });
      });
    });
  });
}

// Outbound events sent to user:{userId} room via emitter.ts:
//   emitNotification(userId, notification)
//   emitConversationUpdated(userId, conversation)
// Presence:update emitted from presence.ts to related users only
