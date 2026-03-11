import { describe, expect, it } from 'vitest';
import {
  CrewErrorEventSchema,
  CrewFinishedEventSchema,
  CrewStepCompletedEventSchema,
  CrewStepSchema,
  CrewStepStartedEventSchema,
} from '../types/crews.js';

/* ================================================================
 * CrewStepSchema
 * ================================================================ */
describe('CrewStepSchema', () => {
  it('accepts a valid crew step with all fields', () => {
    const data = {
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'researcher',
      parallelGroup: 'group-a',
    };
    expect(CrewStepSchema.parse(data)).toEqual(data);
  });

  it('accepts without optional parallelGroup', () => {
    const data = {
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'writer',
    };
    expect(CrewStepSchema.parse(data)).toEqual(data);
  });

  it('rejects non-UUID agentId', () => {
    const data = { agentId: 'not-a-uuid', role: 'researcher' };
    const result = CrewStepSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty agentId', () => {
    const data = { agentId: '', role: 'researcher' };
    const result = CrewStepSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty role (min 1 character)', () => {
    const data = {
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: '',
    };
    const result = CrewStepSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects role exceeding 64 characters', () => {
    const data = {
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'a'.repeat(65),
    };
    const result = CrewStepSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts role at exactly 64 characters', () => {
    const data = {
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'a'.repeat(64),
    };
    expect(CrewStepSchema.parse(data)).toEqual(data);
  });

  it('rejects parallelGroup exceeding 32 characters', () => {
    const data = {
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'writer',
      parallelGroup: 'g'.repeat(33),
    };
    const result = CrewStepSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts parallelGroup at exactly 32 characters', () => {
    const data = {
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'writer',
      parallelGroup: 'g'.repeat(32),
    };
    expect(CrewStepSchema.parse(data)).toEqual(data);
  });

  it('accepts empty parallelGroup string', () => {
    const data = {
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'writer',
      parallelGroup: '',
    };
    expect(CrewStepSchema.parse(data)).toEqual(data);
  });

  it('rejects missing agentId', () => {
    const data = { role: 'researcher' };
    const result = CrewStepSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing role', () => {
    const data = { agentId: '550e8400-e29b-41d4-a716-446655440000' };
    const result = CrewStepSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('strips extra fields', () => {
    const data = {
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'coder',
      extra: true,
    };
    const parsed = CrewStepSchema.parse(data);
    expect(parsed).not.toHaveProperty('extra');
  });
});

/* ================================================================
 * CrewStepStartedEventSchema
 * ================================================================ */
describe('CrewStepStartedEventSchema', () => {
  it('accepts valid data with all fields', () => {
    const data = {
      type: 'crew:step_started',
      crew_id: 'crew1',
      step_index: 0,
      agent_id: 'a1',
      role: 'researcher',
      parallel_group: 'pg1',
    };
    expect(CrewStepStartedEventSchema.parse(data)).toEqual(data);
  });

  it('accepts without optional parallel_group', () => {
    const data = {
      type: 'crew:step_started',
      crew_id: 'crew1',
      step_index: 2,
      agent_id: 'a1',
      role: 'writer',
    };
    expect(CrewStepStartedEventSchema.parse(data)).toEqual(data);
  });

  it('rejects wrong type literal', () => {
    const data = {
      type: 'crew:step_completed',
      crew_id: 'crew1',
      step_index: 0,
      agent_id: 'a1',
      role: 'r',
    };
    const result = CrewStepStartedEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing crew_id', () => {
    const result = CrewStepStartedEventSchema.safeParse({
      type: 'crew:step_started',
      step_index: 0,
      agent_id: 'a1',
      role: 'r',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing step_index', () => {
    const result = CrewStepStartedEventSchema.safeParse({
      type: 'crew:step_started',
      crew_id: 'c1',
      agent_id: 'a1',
      role: 'r',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-number step_index', () => {
    const result = CrewStepStartedEventSchema.safeParse({
      type: 'crew:step_started',
      crew_id: 'c1',
      step_index: 'zero',
      agent_id: 'a1',
      role: 'r',
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * CrewStepCompletedEventSchema
 * ================================================================ */
describe('CrewStepCompletedEventSchema', () => {
  it('accepts valid data', () => {
    const data = {
      type: 'crew:step_completed',
      crew_id: 'crew1',
      step_index: 1,
      agent_id: 'a2',
      role: 'editor',
      response: 'Edits applied successfully.',
    };
    expect(CrewStepCompletedEventSchema.parse(data)).toEqual(data);
  });

  it('rejects missing response', () => {
    const result = CrewStepCompletedEventSchema.safeParse({
      type: 'crew:step_completed',
      crew_id: 'c1',
      step_index: 0,
      agent_id: 'a1',
      role: 'r',
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong type literal', () => {
    const result = CrewStepCompletedEventSchema.safeParse({
      type: 'crew:finished',
      crew_id: 'c1',
      step_index: 0,
      agent_id: 'a1',
      role: 'r',
      response: 'ok',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing role', () => {
    const result = CrewStepCompletedEventSchema.safeParse({
      type: 'crew:step_completed',
      crew_id: 'c1',
      step_index: 0,
      agent_id: 'a1',
      response: 'ok',
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * CrewFinishedEventSchema
 * ================================================================ */
describe('CrewFinishedEventSchema', () => {
  it('accepts valid data', () => {
    const data = {
      type: 'crew:finished',
      crew_id: 'crew1',
      total_steps: 3,
      final_response: 'All done.',
    };
    expect(CrewFinishedEventSchema.parse(data)).toEqual(data);
  });

  it('rejects missing total_steps', () => {
    const result = CrewFinishedEventSchema.safeParse({
      type: 'crew:finished',
      crew_id: 'c1',
      final_response: 'Done',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing final_response', () => {
    const result = CrewFinishedEventSchema.safeParse({
      type: 'crew:finished',
      crew_id: 'c1',
      total_steps: 3,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-number total_steps', () => {
    const result = CrewFinishedEventSchema.safeParse({
      type: 'crew:finished',
      crew_id: 'c1',
      total_steps: 'three',
      final_response: 'Done',
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong type literal', () => {
    const result = CrewFinishedEventSchema.safeParse({
      type: 'crew:error',
      crew_id: 'c1',
      total_steps: 3,
      final_response: 'Done',
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * CrewErrorEventSchema
 * ================================================================ */
describe('CrewErrorEventSchema', () => {
  it('accepts valid data with step_index', () => {
    const data = {
      type: 'crew:error',
      crew_id: 'crew1',
      error: 'Agent timed out',
      step_index: 2,
    };
    expect(CrewErrorEventSchema.parse(data)).toEqual(data);
  });

  it('accepts without optional step_index', () => {
    const data = {
      type: 'crew:error',
      crew_id: 'crew1',
      error: 'Unknown failure',
    };
    expect(CrewErrorEventSchema.parse(data)).toEqual(data);
  });

  it('rejects missing error', () => {
    const result = CrewErrorEventSchema.safeParse({
      type: 'crew:error',
      crew_id: 'c1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing crew_id', () => {
    const result = CrewErrorEventSchema.safeParse({
      type: 'crew:error',
      error: 'oops',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-number step_index', () => {
    const result = CrewErrorEventSchema.safeParse({
      type: 'crew:error',
      crew_id: 'c1',
      error: 'oops',
      step_index: 'two',
    });
    expect(result.success).toBe(false);
  });
});
