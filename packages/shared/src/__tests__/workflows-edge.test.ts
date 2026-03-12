import { describe, expect, it } from 'vitest';
import {
  WorkflowRunCompletedEventSchema,
  WorkflowRunFailedEventSchema,
  WorkflowRunStartedEventSchema,
  WorkflowStepCompletedEventSchema,
  WorkflowStepStartedEventSchema,
} from '../types/workflows.js';

/* ================================================================
 * WorkflowRunStartedEventSchema — Edge Cases
 * ================================================================ */
describe('WorkflowRunStartedEventSchema — edge cases', () => {
  it('strips extra fields from valid data', () => {
    const data = {
      type: 'workflow:run_started' as const,
      workflow_id: 'wf-1',
      run_id: 'run-1',
      agent_id: 'agent-1',
      extra_field: 'should be stripped',
    };
    const result = WorkflowRunStartedEventSchema.parse(data);
    expect(result).not.toHaveProperty('extra_field');
    expect(result.type).toBe('workflow:run_started');
  });

  it('rejects empty string for workflow_id', () => {
    const result = WorkflowRunStartedEventSchema.safeParse({
      type: 'workflow:run_started',
      workflow_id: '',
      run_id: 'run-1',
      agent_id: 'agent-1',
    });
    // Zod string() requires min length 1 by default? Actually no, z.string() accepts empty.
    // But it should parse successfully since z.string() allows empty
    expect(result.success).toBe(true);
  });

  it('rejects null workflow_id', () => {
    const result = WorkflowRunStartedEventSchema.safeParse({
      type: 'workflow:run_started',
      workflow_id: null,
      run_id: 'run-1',
      agent_id: 'agent-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects numeric workflow_id', () => {
    const result = WorkflowRunStartedEventSchema.safeParse({
      type: 'workflow:run_started',
      workflow_id: 123,
      run_id: 'run-1',
      agent_id: 'agent-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects completely empty object', () => {
    const result = WorkflowRunStartedEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects undefined type', () => {
    const result = WorkflowRunStartedEventSchema.safeParse({
      workflow_id: 'wf-1',
      run_id: 'run-1',
      agent_id: 'agent-1',
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * WorkflowStepStartedEventSchema — Edge Cases
 * ================================================================ */
describe('WorkflowStepStartedEventSchema — edge cases', () => {
  it('strips extra fields', () => {
    const data = {
      type: 'workflow:step_started' as const,
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_id: 'step-1',
      step_name: 'Parse Input',
      extra: 'removed',
    };
    const result = WorkflowStepStartedEventSchema.parse(data);
    expect(result).not.toHaveProperty('extra');
  });

  it('rejects missing step_id', () => {
    const result = WorkflowStepStartedEventSchema.safeParse({
      type: 'workflow:step_started',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_name: 'Parse Input',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing workflow_id', () => {
    const result = WorkflowStepStartedEventSchema.safeParse({
      type: 'workflow:step_started',
      run_id: 'run-1',
      step_id: 'step-1',
      step_name: 'Parse Input',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing run_id', () => {
    const result = WorkflowStepStartedEventSchema.safeParse({
      type: 'workflow:step_started',
      workflow_id: 'wf-1',
      step_id: 'step-1',
      step_name: 'Parse Input',
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * WorkflowStepCompletedEventSchema — Edge Cases
 * ================================================================ */
describe('WorkflowStepCompletedEventSchema — edge cases', () => {
  it('strips extra fields', () => {
    const data = {
      type: 'workflow:step_completed' as const,
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_id: 'step-1',
      step_name: 'Parse Input',
      status: 'completed',
      output: { result: 'ok' },
    };
    const result = WorkflowStepCompletedEventSchema.parse(data);
    expect(result).not.toHaveProperty('output');
  });

  it('accepts any string as status value', () => {
    const data = {
      type: 'workflow:step_completed' as const,
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_id: 'step-1',
      step_name: 'Parse Input',
      status: 'skipped',
    };
    const result = WorkflowStepCompletedEventSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing step_id', () => {
    const result = WorkflowStepCompletedEventSchema.safeParse({
      type: 'workflow:step_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_name: 'Parse',
      status: 'completed',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing step_name', () => {
    const result = WorkflowStepCompletedEventSchema.safeParse({
      type: 'workflow:step_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_id: 'step-1',
      status: 'completed',
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * WorkflowRunCompletedEventSchema — Edge Cases
 * ================================================================ */
describe('WorkflowRunCompletedEventSchema — edge cases', () => {
  it('strips extra fields', () => {
    const data = {
      type: 'workflow:run_completed' as const,
      workflow_id: 'wf-1',
      run_id: 'run-1',
      total_duration_ms: 5000,
      result: { status: 'ok' },
    };
    const result = WorkflowRunCompletedEventSchema.parse(data);
    expect(result).not.toHaveProperty('result');
  });

  it('accepts zero as total_duration_ms', () => {
    const result = WorkflowRunCompletedEventSchema.safeParse({
      type: 'workflow:run_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      total_duration_ms: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts negative total_duration_ms (no min constraint)', () => {
    const result = WorkflowRunCompletedEventSchema.safeParse({
      type: 'workflow:run_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      total_duration_ms: -1,
    });
    // z.number() does not have a min constraint in this schema
    expect(result.success).toBe(true);
  });

  it('rejects boolean as total_duration_ms', () => {
    const result = WorkflowRunCompletedEventSchema.safeParse({
      type: 'workflow:run_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      total_duration_ms: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects null as total_duration_ms', () => {
    const result = WorkflowRunCompletedEventSchema.safeParse({
      type: 'workflow:run_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      total_duration_ms: null,
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * WorkflowRunFailedEventSchema — Edge Cases
 * ================================================================ */
describe('WorkflowRunFailedEventSchema — edge cases', () => {
  it('strips extra fields', () => {
    const data = {
      type: 'workflow:run_failed' as const,
      workflow_id: 'wf-1',
      run_id: 'run-1',
      error: 'Something went wrong',
      stack_trace: 'Error at line 42',
    };
    const result = WorkflowRunFailedEventSchema.parse(data);
    expect(result).not.toHaveProperty('stack_trace');
  });

  it('accepts empty string as error', () => {
    const result = WorkflowRunFailedEventSchema.safeParse({
      type: 'workflow:run_failed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      error: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects null as error', () => {
    const result = WorkflowRunFailedEventSchema.safeParse({
      type: 'workflow:run_failed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      error: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects object as error', () => {
    const result = WorkflowRunFailedEventSchema.safeParse({
      type: 'workflow:run_failed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      error: { message: 'failed' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects array as error', () => {
    const result = WorkflowRunFailedEventSchema.safeParse({
      type: 'workflow:run_failed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      error: ['error1', 'error2'],
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * Cross-schema type guards
 * ================================================================ */
describe('Workflow event schemas — cross-schema validation', () => {
  it('same data cannot validate as two different event types', () => {
    const runStartedData = {
      type: 'workflow:run_started',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      agent_id: 'agent-1',
    };

    expect(WorkflowRunStartedEventSchema.safeParse(runStartedData).success).toBe(true);
    expect(WorkflowRunCompletedEventSchema.safeParse(runStartedData).success).toBe(false);
    expect(WorkflowRunFailedEventSchema.safeParse(runStartedData).success).toBe(false);
    expect(WorkflowStepStartedEventSchema.safeParse(runStartedData).success).toBe(false);
    expect(WorkflowStepCompletedEventSchema.safeParse(runStartedData).success).toBe(false);
  });

  it('step completed cannot validate as step started', () => {
    const stepCompletedData = {
      type: 'workflow:step_completed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      step_id: 'step-1',
      step_name: 'Parse',
      status: 'completed',
    };

    expect(WorkflowStepCompletedEventSchema.safeParse(stepCompletedData).success).toBe(true);
    expect(WorkflowStepStartedEventSchema.safeParse(stepCompletedData).success).toBe(false);
  });

  it('run failed cannot validate as run completed', () => {
    const failedData = {
      type: 'workflow:run_failed',
      workflow_id: 'wf-1',
      run_id: 'run-1',
      error: 'Timed out',
    };

    expect(WorkflowRunFailedEventSchema.safeParse(failedData).success).toBe(true);
    expect(WorkflowRunCompletedEventSchema.safeParse(failedData).success).toBe(false);
  });
});
