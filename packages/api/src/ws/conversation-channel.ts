import type { Server as SocketIOServer } from 'socket.io';
import { sql } from '../db/connection.js';

export function setupConversationHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    socket.on('join:conversation', async (conversationId: string, callback?: (ok: boolean) => void) => {
      if (!conversationId || typeof conversationId !== 'string') {
        callback?.(false);
        return;
      }

      // Verify user is a member of this conversation
      const result = await sql`
        SELECT 1 FROM conversation_members
        WHERE conversation_id = ${conversationId}::uuid
          AND user_id = ${userId}::uuid
        LIMIT 1
      `;

      if (result.length === 0) {
        callback?.(false);
        return;
      }

      socket.join(`conversation:${conversationId}`);
      callback?.(true);
    });

    socket.on('leave:conversation', (conversationId: string) => {
      if (!conversationId || typeof conversationId !== 'string') return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing:start', (conversationId: string) => {
      if (!conversationId || typeof conversationId !== 'string') return;
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId, conversationId });
    });

    socket.on('typing:stop', (conversationId: string) => {
      if (!conversationId || typeof conversationId !== 'string') return;
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId, conversationId });
    });
  });
}
