import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DB connection (required by transitive imports)
vi.mock('../../db/connection.js', () => ({
  sql: Object.assign(vi.fn(), { unsafe: vi.fn() }),
  db: {},
}));

/** Minimal mock of a Socket.IO Server's room-targeting chain */
function createMockIO() {
  const emitFn = vi.fn();
  const fetchSocketsFn = vi.fn().mockResolvedValue([]);
  const toFn = vi.fn().mockReturnValue({ emit: emitFn });
  const inFn = vi.fn().mockReturnValue({ fetchSockets: fetchSocketsFn });

  const io = { to: toFn, in: inFn, emit: emitFn } as any;
  return { io, toFn, inFn, emitFn, fetchSocketsFn };
}

describe('emitter', () => {
  let setIO: typeof import('../../ws/emitter.js').setIO;
  let emitAgentEvent: typeof import('../../ws/emitter.js').emitAgentEvent;
  let emitMessage: typeof import('../../ws/emitter.js').emitMessage;
  let emitMessageUpdated: typeof import('../../ws/emitter.js').emitMessageUpdated;
  let emitMessageDeleted: typeof import('../../ws/emitter.js').emitMessageDeleted;
  let emitNotification: typeof import('../../ws/emitter.js').emitNotification;
  let emitConversationUpdated: typeof import('../../ws/emitter.js').emitConversationUpdated;
  let emitA2AEvent: typeof import('../../ws/emitter.js').emitA2AEvent;
  let emitCrewEvent: typeof import('../../ws/emitter.js').emitCrewEvent;
  let emitFeedbackEvent: typeof import('../../ws/emitter.js').emitFeedbackEvent;
  let forceLeaveRoom: typeof import('../../ws/emitter.js').forceLeaveRoom;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../ws/emitter.js');
    setIO = mod.setIO;
    emitAgentEvent = mod.emitAgentEvent;
    emitMessage = mod.emitMessage;
    emitMessageUpdated = mod.emitMessageUpdated;
    emitMessageDeleted = mod.emitMessageDeleted;
    emitNotification = mod.emitNotification;
    emitConversationUpdated = mod.emitConversationUpdated;
    emitA2AEvent = mod.emitA2AEvent;
    emitCrewEvent = mod.emitCrewEvent;
    emitFeedbackEvent = mod.emitFeedbackEvent;
    forceLeaveRoom = mod.forceLeaveRoom;
  });

  // ---------- io not initialized ----------

  describe('before setIO is called', () => {
    it('emitAgentEvent throws', () => {
      expect(() => emitAgentEvent('conv-1', { type: 'text_delta', text: 'hi' })).toThrow(
        'Socket.IO not initialized',
      );
    });

    it('emitMessage throws', () => {
      expect(() => emitMessage('conv-1', {})).toThrow('Socket.IO not initialized');
    });

    it('emitMessageUpdated throws', () => {
      expect(() => emitMessageUpdated('conv-1', {})).toThrow('Socket.IO not initialized');
    });

    it('emitMessageDeleted throws', () => {
      expect(() => emitMessageDeleted('conv-1', 'msg-1')).toThrow('Socket.IO not initialized');
    });

    it('emitNotification throws', () => {
      expect(() => emitNotification('user-1', {})).toThrow('Socket.IO not initialized');
    });

    it('emitConversationUpdated throws', () => {
      expect(() => emitConversationUpdated('user-1', {})).toThrow('Socket.IO not initialized');
    });

    it('emitA2AEvent throws', () => {
      expect(() =>
        emitA2AEvent('conv-1', {
          type: 'a2a_call_start',
          caller_agent_id: 'a1',
          callee_agent_id: 'a2',
        }),
      ).toThrow('Socket.IO not initialized');
    });

    it('emitCrewEvent throws', () => {
      expect(() =>
        emitCrewEvent('conv-1', {
          type: 'crew:finished',
          crew_id: 'c1',
          total_steps: 1,
          final_response: 'done',
        }),
      ).toThrow('Socket.IO not initialized');
    });

    it('emitFeedbackEvent throws', () => {
      expect(() => emitFeedbackEvent('conv-1', {})).toThrow('Socket.IO not initialized');
    });

    it('forceLeaveRoom does NOT throw (no-op)', () => {
      expect(() => forceLeaveRoom('user-1', 'conv-1')).not.toThrow();
    });
  });

  // ---------- io initialized ----------

  describe('after setIO', () => {
    let toFn: ReturnType<typeof createMockIO>['toFn'];
    let inFn: ReturnType<typeof createMockIO>['inFn'];
    let emitFn: ReturnType<typeof createMockIO>['emitFn'];

    beforeEach(() => {
      const mock = createMockIO();
      toFn = mock.toFn;
      inFn = mock.inFn;
      emitFn = mock.emitFn;
      setIO(mock.io);
    });

    it('emitAgentEvent emits to agent:<conversationId>', () => {
      const event = { type: 'text_delta' as const, text: 'hello' };
      emitAgentEvent('conv-42', event);

      expect(toFn).toHaveBeenCalledWith('agent:conv-42');
      expect(emitFn).toHaveBeenCalledWith('agent:event', event);
    });

    it('emitMessage emits to conversation:<id>', () => {
      const msg = { id: 'm1', body: 'hello' };
      emitMessage('conv-1', msg);

      expect(toFn).toHaveBeenCalledWith('conversation:conv-1');
      expect(emitFn).toHaveBeenCalledWith('message:new', msg);
    });

    it('emitMessageUpdated emits message:updated', () => {
      const msg = { id: 'm1', body: 'edited' };
      emitMessageUpdated('conv-1', msg);

      expect(toFn).toHaveBeenCalledWith('conversation:conv-1');
      expect(emitFn).toHaveBeenCalledWith('message:updated', msg);
    });

    it('emitMessageDeleted emits message:deleted with messageId and conversationId', () => {
      emitMessageDeleted('conv-1', 'msg-99');

      expect(toFn).toHaveBeenCalledWith('conversation:conv-1');
      expect(emitFn).toHaveBeenCalledWith('message:deleted', {
        messageId: 'msg-99',
        conversationId: 'conv-1',
      });
    });

    it('emitNotification emits to user:<userId>', () => {
      const notif = { title: 'New message' };
      emitNotification('user-7', notif);

      expect(toFn).toHaveBeenCalledWith('user:user-7');
      expect(emitFn).toHaveBeenCalledWith('notification', notif);
    });

    it('emitConversationUpdated emits to user:<userId>', () => {
      const conv = { id: 'conv-1', title: 'Updated' };
      emitConversationUpdated('user-7', conv);

      expect(toFn).toHaveBeenCalledWith('user:user-7');
      expect(emitFn).toHaveBeenCalledWith('conversation:updated', conv);
    });

    it('emitA2AEvent emits to agent:<conversationId>', () => {
      const event = {
        type: 'a2a_call_start' as const,
        caller_agent_id: 'a1',
        callee_agent_id: 'a2',
        callee_name: 'Helper',
      };
      emitA2AEvent('conv-1', event);

      expect(toFn).toHaveBeenCalledWith('agent:conv-1');
      expect(emitFn).toHaveBeenCalledWith('a2a:event', event);
    });

    it('emitCrewEvent emits to agent:<conversationId>', () => {
      const event = {
        type: 'crew:step_started' as const,
        crew_id: 'crew-1',
        step_index: 0,
        agent_id: 'a1',
        role: 'researcher',
      };
      emitCrewEvent('conv-1', event);

      expect(toFn).toHaveBeenCalledWith('agent:conv-1');
      expect(emitFn).toHaveBeenCalledWith('crew:event', event);
    });

    it('emitFeedbackEvent emits to conversation:<conversationId>', () => {
      const event = { type: 'thumbs_up', messageId: 'm1' };
      emitFeedbackEvent('conv-1', event);

      expect(toFn).toHaveBeenCalledWith('conversation:conv-1');
      expect(emitFn).toHaveBeenCalledWith('feedback:event', event);
    });

    it('forceLeaveRoom fetches sockets from user room and leaves both rooms', async () => {
      const leaveFn = vi.fn();
      const fakeSockets = [{ leave: leaveFn }, { leave: leaveFn }];
      const fetchSocketsFn = vi.fn().mockResolvedValue(fakeSockets);
      inFn.mockReturnValue({ fetchSockets: fetchSocketsFn });

      forceLeaveRoom('user-7', 'conv-1');

      // forceLeaveRoom is fire-and-forget; wait for microtask
      await vi.waitFor(() => {
        expect(inFn).toHaveBeenCalledWith('user:user-7');
        expect(fetchSocketsFn).toHaveBeenCalled();
        expect(leaveFn).toHaveBeenCalledWith('conversation:conv-1');
        expect(leaveFn).toHaveBeenCalledWith('agent:conv-1');
        expect(leaveFn).toHaveBeenCalledTimes(4); // 2 sockets * 2 rooms
      });
    });
  });

  // ---------- setIO can be called multiple times ----------

  it('setIO updates the io reference for subsequent calls', () => {
    const mock1 = createMockIO();
    const mock2 = createMockIO();

    setIO(mock1.io);
    emitMessage('c1', { body: 'a' });
    expect(mock1.toFn).toHaveBeenCalledTimes(1);

    setIO(mock2.io);
    emitMessage('c2', { body: 'b' });
    expect(mock2.toFn).toHaveBeenCalledTimes(1);
    // mock1 should not have received the second call
    expect(mock1.toFn).toHaveBeenCalledTimes(1);
  });
});
