import type { Server as SocketIOServer } from 'socket.io';
import { sql } from '../db/connection.js';

export function setupAgentHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    socket.on('join:agent', async (conversationId: string, callback?: (ok: boolean) => void) => {
      if (!conversationId || typeof conversationId !== 'string') {
        callback?.(false);
        return;
      }

      // Verify user is a member of the conversation before allowing agent stream access
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

      socket.join(`agent:${conversationId}`);
      callback?.(true);
    });

    socket.on('leave:agent', (conversationId: string) => {
      if (!conversationId || typeof conversationId !== 'string') return;
      socket.leave(`agent:${conversationId}`);
    });
  });
}

// Outbound AG-UI events are sent via emitter.ts: emitAgentEvent()
// Event types: run_started, text_delta, tool_call_start, tool_call_end,
//              step_started, thinking, run_finished, run_error
