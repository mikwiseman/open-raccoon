import { describe, expect, it } from 'vitest';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/index.js';
import {
  AgentEventSchema,
  CollaborationFailedEventSchema,
  CollaborationProgressEventSchema,
  CrewErrorEventSchema,
  CrewFinishedEventSchema,
  CrewStepCompletedEventSchema,
  CrewStepStartedEventSchema,
  RunErrorEventSchema,
  RunFinishedEventSchema,
  RunStartedEventSchema,
  StepStartedEventSchema,
  TextDeltaEventSchema,
  ThinkingEventSchema,
  ToolApprovalRequestEventSchema,
  ToolCallEndEventSchema,
  ToolCallStartEventSchema,
  WorkflowRunCompletedEventSchema,
  WorkflowRunFailedEventSchema,
  WorkflowRunStartedEventSchema,
  WorkflowStepCompletedEventSchema,
  WorkflowStepStartedEventSchema,
} from '../types/index.js';

/* ================================================================
 * AgentEventSchema — discriminated union
 * ================================================================ */

describe('AgentEventSchema — run_started', () => {
  it('accepts valid run_started event', () => {
    const event = { type: 'run_started', run_id: 'r1', agent_id: 'a1' };
    const result = RunStartedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('rejects run_started with missing run_id', () => {
    const result = RunStartedEventSchema.safeParse({ type: 'run_started', agent_id: 'a1' });
    expect(result.success).toBe(false);
  });

  it('rejects run_started with missing agent_id', () => {
    const result = RunStartedEventSchema.safeParse({ type: 'run_started', run_id: 'r1' });
    expect(result.success).toBe(false);
  });

  it('rejects run_started with wrong type literal', () => {
    const result = RunStartedEventSchema.safeParse({
      type: 'text_delta',
      run_id: 'r1',
      agent_id: 'a1',
    });
    expect(result.success).toBe(false);
  });
});

describe('AgentEventSchema — text_delta', () => {
  it('accepts valid text_delta event', () => {
    const event = { type: 'text_delta', text: 'Hello' };
    const result = TextDeltaEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.text).toBe('Hello');
  });

  it('accepts text_delta with empty string', () => {
    const result = TextDeltaEventSchema.safeParse({ type: 'text_delta', text: '' });
    expect(result.success).toBe(true);
  });

  it('rejects text_delta with missing text', () => {
    const result = TextDeltaEventSchema.safeParse({ type: 'text_delta' });
    expect(result.success).toBe(false);
  });

  it('rejects text_delta with numeric text', () => {
    const result = TextDeltaEventSchema.safeParse({ type: 'text_delta', text: 42 });
    expect(result.success).toBe(false);
  });
});

describe('AgentEventSchema — tool_call_start', () => {
  it('accepts valid tool_call_start with input', () => {
    const event = { type: 'tool_call_start', name: 'search', call_id: 'c1', input: { q: 'test' } };
    const result = ToolCallStartEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('accepts tool_call_start without optional input', () => {
    const event = { type: 'tool_call_start', name: 'search', call_id: 'c1' };
    const result = ToolCallStartEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('rejects tool_call_start missing name', () => {
    const result = ToolCallStartEventSchema.safeParse({
      type: 'tool_call_start',
      call_id: 'c1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects tool_call_start missing call_id', () => {
    const result = ToolCallStartEventSchema.safeParse({
      type: 'tool_call_start',
      name: 'search',
    });
    expect(result.success).toBe(false);
  });
});

describe('AgentEventSchema — tool_call_end', () => {
  it('accepts valid tool_call_end', () => {
    const event = {
      type: 'tool_call_end',
      name: 'search',
      call_id: 'c1',
      result: 'Found 3 results',
      duration_ms: 150,
    };
    const result = ToolCallEndEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.duration_ms).toBe(150);
  });

  it('rejects tool_call_end with missing result', () => {
    const result = ToolCallEndEventSchema.safeParse({
      type: 'tool_call_end',
      name: 'search',
      call_id: 'c1',
      duration_ms: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects tool_call_end with missing duration_ms', () => {
    const result = ToolCallEndEventSchema.safeParse({
      type: 'tool_call_end',
      name: 'search',
      call_id: 'c1',
      result: 'done',
    });
    expect(result.success).toBe(false);
  });

  it('rejects tool_call_end with string duration_ms', () => {
    const result = ToolCallEndEventSchema.safeParse({
      type: 'tool_call_end',
      name: 'search',
      call_id: 'c1',
      result: 'done',
      duration_ms: 'fast',
    });
    expect(result.success).toBe(false);
  });
});

describe('AgentEventSchema — step_started', () => {
  it('accepts valid step_started', () => {
    const event = { type: 'step_started', step: 'analyze', index: 0 };
    const result = StepStartedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('rejects step_started missing index', () => {
    const result = StepStartedEventSchema.safeParse({ type: 'step_started', step: 'analyze' });
    expect(result.success).toBe(false);
  });

  it('rejects step_started with string index', () => {
    const result = StepStartedEventSchema.safeParse({
      type: 'step_started',
      step: 'analyze',
      index: 'first',
    });
    expect(result.success).toBe(false);
  });
});

describe('AgentEventSchema — thinking', () => {
  it('accepts valid thinking event', () => {
    const event = { type: 'thinking', summary: 'Analyzing the data...' };
    const result = ThinkingEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('rejects thinking with missing summary', () => {
    const result = ThinkingEventSchema.safeParse({ type: 'thinking' });
    expect(result.success).toBe(false);
  });

  it('accepts thinking with empty summary', () => {
    const result = ThinkingEventSchema.safeParse({ type: 'thinking', summary: '' });
    expect(result.success).toBe(true);
  });
});

describe('AgentEventSchema — run_finished', () => {
  it('accepts valid run_finished event', () => {
    const event = {
      type: 'run_finished',
      usage: { input_tokens: 100, output_tokens: 50 },
    };
    const result = RunFinishedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('rejects run_finished with missing usage', () => {
    const result = RunFinishedEventSchema.safeParse({ type: 'run_finished' });
    expect(result.success).toBe(false);
  });

  it('rejects run_finished with incomplete usage object', () => {
    const result = RunFinishedEventSchema.safeParse({
      type: 'run_finished',
      usage: { input_tokens: 100 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects run_finished with string token counts', () => {
    const result = RunFinishedEventSchema.safeParse({
      type: 'run_finished',
      usage: { input_tokens: 'a lot', output_tokens: 'some' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts run_finished with zero token counts', () => {
    const result = RunFinishedEventSchema.safeParse({
      type: 'run_finished',
      usage: { input_tokens: 0, output_tokens: 0 },
    });
    expect(result.success).toBe(true);
  });
});

describe('AgentEventSchema — run_error', () => {
  it('accepts valid run_error event', () => {
    const event = { type: 'run_error', error: 'Timeout exceeded' };
    const result = RunErrorEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('rejects run_error with missing error', () => {
    const result = RunErrorEventSchema.safeParse({ type: 'run_error' });
    expect(result.success).toBe(false);
  });

  it('accepts run_error with empty error string', () => {
    const result = RunErrorEventSchema.safeParse({ type: 'run_error', error: '' });
    expect(result.success).toBe(true);
  });
});

describe('AgentEventSchema — tool_approval_request', () => {
  it('accepts valid tool_approval_request', () => {
    const event = {
      type: 'tool_approval_request',
      request_id: 'req-1',
      tool_name: 'execute_code',
      args_preview: '{"code": "rm -rf /"}',
      scopes: ['allow_once', 'always_for_agent_tool'],
    };
    const result = ToolApprovalRequestEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.scopes).toHaveLength(2);
  });

  it('rejects tool_approval_request with missing scopes', () => {
    const result = ToolApprovalRequestEventSchema.safeParse({
      type: 'tool_approval_request',
      request_id: 'req-1',
      tool_name: 'execute_code',
      args_preview: '{}',
    });
    expect(result.success).toBe(false);
  });

  it('accepts tool_approval_request with empty scopes array', () => {
    const result = ToolApprovalRequestEventSchema.safeParse({
      type: 'tool_approval_request',
      request_id: 'req-1',
      tool_name: 'execute_code',
      args_preview: '{}',
      scopes: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects tool_approval_request with non-string scopes', () => {
    const result = ToolApprovalRequestEventSchema.safeParse({
      type: 'tool_approval_request',
      request_id: 'req-1',
      tool_name: 'execute_code',
      args_preview: '{}',
      scopes: [1, 2, 3],
    });
    expect(result.success).toBe(false);
  });
});

describe('AgentEventSchema — discriminated union', () => {
  it('parses run_started through discriminated union', () => {
    const result = AgentEventSchema.safeParse({
      type: 'run_started',
      run_id: 'r1',
      agent_id: 'a1',
    });
    expect(result.success).toBe(true);
  });

  it('parses text_delta through discriminated union', () => {
    const result = AgentEventSchema.safeParse({ type: 'text_delta', text: 'hi' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown event type in discriminated union', () => {
    const result = AgentEventSchema.safeParse({ type: 'unknown_event', data: 'test' });
    expect(result.success).toBe(false);
  });

  it('rejects null through discriminated union', () => {
    const result = AgentEventSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('rejects empty object through discriminated union', () => {
    const result = AgentEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * Collaboration Events
 * ================================================================ */

describe('CollaborationProgressEventSchema', () => {
  it('accepts valid progress event', () => {
    const event = {
      type: 'collaboration:progress',
      collaboration_id: 'collab-1',
      agent_id: 'a1',
      status: 'in_progress',
      message: 'Working on it...',
    };
    expect(CollaborationProgressEventSchema.parse(event)).toEqual(event);
  });

  it('rejects progress event with wrong type', () => {
    const result = CollaborationProgressEventSchema.safeParse({
      type: 'collaboration:requested',
      collaboration_id: 'collab-1',
      agent_id: 'a1',
      status: 'in_progress',
      message: 'Working...',
    });
    expect(result.success).toBe(false);
  });

  it('rejects progress event missing message', () => {
    const result = CollaborationProgressEventSchema.safeParse({
      type: 'collaboration:progress',
      collaboration_id: 'collab-1',
      agent_id: 'a1',
      status: 'in_progress',
    });
    expect(result.success).toBe(false);
  });
});

describe('CollaborationFailedEventSchema', () => {
  it('accepts valid failed event', () => {
    const event = {
      type: 'collaboration:failed',
      collaboration_id: 'collab-1',
      agent_id: 'a1',
      message: 'Agent crashed',
    };
    expect(CollaborationFailedEventSchema.parse(event)).toEqual(event);
  });

  it('rejects failed event with wrong type', () => {
    const result = CollaborationFailedEventSchema.safeParse({
      type: 'collaboration:completed',
      collaboration_id: 'collab-1',
      agent_id: 'a1',
      message: 'Crashed',
    });
    expect(result.success).toBe(false);
  });

  it('rejects failed event missing message', () => {
    const result = CollaborationFailedEventSchema.safeParse({
      type: 'collaboration:failed',
      collaboration_id: 'collab-1',
      agent_id: 'a1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects failed event missing agent_id', () => {
    const result = CollaborationFailedEventSchema.safeParse({
      type: 'collaboration:failed',
      collaboration_id: 'collab-1',
      message: 'Error',
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * Crew Events
 * ================================================================ */

describe('CrewStepStartedEventSchema', () => {
  it('accepts valid step started event', () => {
    const event = {
      type: 'crew:step_started',
      crew_id: 'crew-1',
      step_index: 0,
      agent_id: 'a1',
      role: 'researcher',
    };
    expect(CrewStepStartedEventSchema.parse(event)).toEqual(event);
  });

  it('accepts step started with optional parallel_group', () => {
    const event = {
      type: 'crew:step_started' as const,
      crew_id: 'crew-1',
      step_index: 0,
      agent_id: 'a1',
      role: 'researcher',
      parallel_group: 'group_a',
    };
    const result = CrewStepStartedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.parallel_group).toBe('group_a');
  });

  it('rejects step started with missing crew_id', () => {
    const result = CrewStepStartedEventSchema.safeParse({
      type: 'crew:step_started',
      step_index: 0,
      agent_id: 'a1',
      role: 'researcher',
    });
    expect(result.success).toBe(false);
  });

  it('rejects step started with wrong type', () => {
    const result = CrewStepStartedEventSchema.safeParse({
      type: 'crew:step_completed',
      crew_id: 'crew-1',
      step_index: 0,
      agent_id: 'a1',
      role: 'researcher',
    });
    expect(result.success).toBe(false);
  });
});

describe('CrewStepCompletedEventSchema', () => {
  it('accepts valid step completed event', () => {
    const event = {
      type: 'crew:step_completed',
      crew_id: 'crew-1',
      step_index: 1,
      agent_id: 'a1',
      role: 'writer',
      response: 'Analysis complete.',
    };
    expect(CrewStepCompletedEventSchema.parse(event)).toEqual(event);
  });

  it('rejects step completed missing response', () => {
    const result = CrewStepCompletedEventSchema.safeParse({
      type: 'crew:step_completed',
      crew_id: 'crew-1',
      step_index: 1,
      agent_id: 'a1',
      role: 'writer',
    });
    expect(result.success).toBe(false);
  });
});

describe('CrewFinishedEventSchema', () => {
  it('accepts valid finished event', () => {
    const event = {
      type: 'crew:finished',
      crew_id: 'crew-1',
      total_steps: 3,
      final_response: 'All done.',
    };
    expect(CrewFinishedEventSchema.parse(event)).toEqual(event);
  });

  it('rejects finished missing total_steps', () => {
    const result = CrewFinishedEventSchema.safeParse({
      type: 'crew:finished',
      crew_id: 'crew-1',
      final_response: 'Done',
    });
    expect(result.success).toBe(false);
  });

  it('rejects finished missing final_response', () => {
    const result = CrewFinishedEventSchema.safeParse({
      type: 'crew:finished',
      crew_id: 'crew-1',
      total_steps: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe('CrewErrorEventSchema', () => {
  it('accepts valid error event without step_index', () => {
    const event = {
      type: 'crew:error',
      crew_id: 'crew-1',
      error: 'Agent timed out',
    };
    const result = CrewErrorEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it('accepts error event with optional step_index', () => {
    const event = {
      type: 'crew:error' as const,
      crew_id: 'crew-1',
      error: 'Step failed',
      step_index: 2,
    };
    const result = CrewErrorEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.step_index).toBe(2);
  });

  it('rejects error event with string step_index', () => {
    const result = CrewErrorEventSchema.safeParse({
      type: 'crew:error',
      crew_id: 'crew-1',
      error: 'Failed',
      step_index: 'two',
    });
    expect(result.success).toBe(false);
  });

  it('rejects error event missing error field', () => {
    const result = CrewErrorEventSchema.safeParse({
      type: 'crew:error',
      crew_id: 'crew-1',
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * Workflow Events
 * ================================================================ */

describe('WorkflowRunStartedEventSchema', () => {
  it('accepts valid event', () => {
    const event = {
      type: 'workflow:run_started',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      agent_id: 'a1',
    };
    expect(WorkflowRunStartedEventSchema.parse(event)).toEqual(event);
  });

  it('rejects missing workflow_id', () => {
    const result = WorkflowRunStartedEventSchema.safeParse({
      type: 'workflow:run_started',
      run_id: 'run-1',
      agent_id: 'a1',
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkflowStepStartedEventSchema', () => {
  it('accepts valid event', () => {
    const event = {
      type: 'workflow:step_started',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_id: 'step-1',
      step_name: 'Fetch data',
    };
    expect(WorkflowStepStartedEventSchema.parse(event)).toEqual(event);
  });

  it('rejects missing step_name', () => {
    const result = WorkflowStepStartedEventSchema.safeParse({
      type: 'workflow:step_started',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_id: 'step-1',
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkflowStepCompletedEventSchema', () => {
  it('accepts valid event', () => {
    const event = {
      type: 'workflow:step_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_id: 'step-1',
      step_name: 'Fetch data',
      status: 'completed',
    };
    expect(WorkflowStepCompletedEventSchema.parse(event)).toEqual(event);
  });

  it('rejects missing status', () => {
    const result = WorkflowStepCompletedEventSchema.safeParse({
      type: 'workflow:step_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_id: 'step-1',
      step_name: 'Fetch data',
    });
    expect(result.success).toBe(false);
  });
});

describe('WorkflowRunCompletedEventSchema', () => {
  it('accepts valid event', () => {
    const event = {
      type: 'workflow:run_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      total_duration_ms: 5000,
    };
    expect(WorkflowRunCompletedEventSchema.parse(event)).toEqual(event);
  });

  it('rejects missing total_duration_ms', () => {
    const result = WorkflowRunCompletedEventSchema.safeParse({
      type: 'workflow:run_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero total_duration_ms', () => {
    const result = WorkflowRunCompletedEventSchema.safeParse({
      type: 'workflow:run_completed' as const,
      workflow_id: 'wf-1',
      run_id: 'run-1',
      total_duration_ms: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe('WorkflowRunFailedEventSchema', () => {
  it('accepts valid event', () => {
    const event = {
      type: 'workflow:run_failed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      error: 'Step timed out',
    };
    expect(WorkflowRunFailedEventSchema.parse(event)).toEqual(event);
  });

  it('rejects missing error', () => {
    const result = WorkflowRunFailedEventSchema.safeParse({
      type: 'workflow:run_failed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty error string', () => {
    const result = WorkflowRunFailedEventSchema.safeParse({
      type: 'workflow:run_failed' as const,
      workflow_id: 'wf-1',
      run_id: 'run-1',
      error: '',
    });
    expect(result.success).toBe(true);
  });
});

/* ================================================================
 * ServerToClientEvents / ClientToServerEvents — type-level checks
 * ================================================================ */

describe('ServerToClientEvents — type shape verification', () => {
  it('message:deleted payload requires messageId and conversationId', () => {
    const payload: Parameters<ServerToClientEvents['message:deleted']>[0] = {
      messageId: 'msg-1',
      conversationId: 'conv-1',
    };
    expect(payload.messageId).toBe('msg-1');
    expect(payload.conversationId).toBe('conv-1');
  });

  it('typing:start payload requires userId and conversationId', () => {
    const payload: Parameters<ServerToClientEvents['typing:start']>[0] = {
      userId: 'u1',
      conversationId: 'conv-1',
    };
    expect(payload.userId).toBe('u1');
  });

  it('typing:stop payload requires userId and conversationId', () => {
    const payload: Parameters<ServerToClientEvents['typing:stop']>[0] = {
      userId: 'u1',
      conversationId: 'conv-1',
    };
    expect(payload.conversationId).toBe('conv-1');
  });

  it('presence:update payload has userId and status', () => {
    const payload: Parameters<ServerToClientEvents['presence:update']>[0] = {
      userId: 'u1',
      status: 'online',
    };
    expect(payload.status).toBe('online');
  });

  it('presence:update status can be offline', () => {
    const payload: Parameters<ServerToClientEvents['presence:update']>[0] = {
      userId: 'u1',
      status: 'offline',
    };
    expect(payload.status).toBe('offline');
  });

  it('presence:snapshot is a record of user statuses', () => {
    const snapshot: Parameters<ServerToClientEvents['presence:snapshot']>[0] = {
      user_1: 'online',
      user_2: 'offline',
    };
    expect(snapshot.user_1).toBe('online');
    expect(snapshot.user_2).toBe('offline');
  });
});

describe('ClientToServerEvents — type shape verification', () => {
  it('join:conversation requires conversationId', () => {
    const data: Parameters<ClientToServerEvents['join:conversation']>[0] = {
      conversationId: 'conv-1',
    };
    expect(data.conversationId).toBe('conv-1');
  });

  it('leave:conversation requires conversationId', () => {
    const data: Parameters<ClientToServerEvents['leave:conversation']>[0] = {
      conversationId: 'conv-1',
    };
    expect(data.conversationId).toBe('conv-1');
  });

  it('typing:start client event requires conversationId', () => {
    const data: Parameters<ClientToServerEvents['typing:start']>[0] = {
      conversationId: 'conv-1',
    };
    expect(data.conversationId).toBe('conv-1');
  });

  it('read event requires conversationId and messageId', () => {
    const data: Parameters<ClientToServerEvents['read']>[0] = {
      conversationId: 'conv-1',
      messageId: 'msg-1',
    };
    expect(data.messageId).toBe('msg-1');
  });

  it('agent:stop requires conversationId', () => {
    const data: Parameters<ClientToServerEvents['agent:stop']>[0] = {
      conversationId: 'conv-1',
    };
    expect(data.conversationId).toBe('conv-1');
  });

  it('approval_decision requires all fields', () => {
    const data: Parameters<ClientToServerEvents['approval_decision']>[0] = {
      conversationId: 'conv-1',
      requestId: 'req-1',
      decision: 'approve',
      scope: 'allow_once',
    };
    expect(data.decision).toBe('approve');
    expect(data.scope).toBe('allow_once');
  });

  it('approval_decision can use deny decision', () => {
    const data: Parameters<ClientToServerEvents['approval_decision']>[0] = {
      conversationId: 'conv-1',
      requestId: 'req-1',
      decision: 'deny',
      scope: 'allow_for_session',
    };
    expect(data.decision).toBe('deny');
  });
});
