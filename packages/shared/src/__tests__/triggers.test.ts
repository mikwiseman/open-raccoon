import { describe, expect, it } from 'vitest';
import {
  TriggerConditionGroupSchema,
  TriggerConditionSchema,
  TriggerFiredEventSchema,
} from '../types/triggers.js';

/* ================================================================
 * TriggerConditionSchema
 * ================================================================ */
describe('TriggerConditionSchema', () => {
  it.each(['eq', 'neq', 'contains', 'exists'] as const)('accepts operator "%s"', (op) => {
    const data = { field: 'status', op, value: 'active' };
    expect(TriggerConditionSchema.parse(data)).toEqual(data);
  });

  it('accepts without optional value', () => {
    const data = { field: 'email', op: 'exists' };
    expect(TriggerConditionSchema.parse(data)).toEqual(data);
  });

  it('rejects empty field (min 1 character)', () => {
    const data = { field: '', op: 'eq', value: 'x' };
    const result = TriggerConditionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing field', () => {
    const result = TriggerConditionSchema.safeParse({ op: 'eq', value: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid operator', () => {
    const data = { field: 'status', op: 'gt', value: '5' };
    const result = TriggerConditionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing operator', () => {
    const data = { field: 'status', value: 'active' };
    const result = TriggerConditionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('strips extra fields', () => {
    const data = { field: 'x', op: 'eq', value: 'y', extra: true };
    const parsed = TriggerConditionSchema.parse(data);
    expect(parsed).not.toHaveProperty('extra');
  });
});

/* ================================================================
 * TriggerConditionGroupSchema
 * ================================================================ */
describe('TriggerConditionGroupSchema', () => {
  it('accepts a group with only "all" conditions', () => {
    const data = {
      all: [
        { field: 'status', op: 'eq', value: 'active' },
        { field: 'role', op: 'eq', value: 'admin' },
      ],
    };
    expect(TriggerConditionGroupSchema.parse(data)).toEqual(data);
  });

  it('accepts a group with only "any" conditions', () => {
    const data = {
      any: [{ field: 'tag', op: 'contains', value: 'urgent' }],
    };
    expect(TriggerConditionGroupSchema.parse(data)).toEqual(data);
  });

  it('accepts a group with both "all" and "any" conditions', () => {
    const data = {
      all: [{ field: 'type', op: 'eq', value: 'webhook' }],
      any: [{ field: 'source', op: 'exists' }],
    };
    expect(TriggerConditionGroupSchema.parse(data)).toEqual(data);
  });

  it('accepts an empty group (no all, no any)', () => {
    const data = {};
    expect(TriggerConditionGroupSchema.parse(data)).toEqual(data);
  });

  it('accepts empty arrays for all and any', () => {
    const data = { all: [], any: [] };
    expect(TriggerConditionGroupSchema.parse(data)).toEqual(data);
  });

  it('rejects if "all" contains an invalid condition', () => {
    const data = {
      all: [{ field: '', op: 'eq', value: 'x' }], // field is empty string -> min(1) fails
    };
    const result = TriggerConditionGroupSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects if "any" contains an invalid condition', () => {
    const data = {
      any: [{ field: 'x', op: 'invalid_op' }],
    };
    const result = TriggerConditionGroupSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects if "all" is not an array', () => {
    const data = { all: 'not-an-array' };
    const result = TriggerConditionGroupSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects if "any" is not an array', () => {
    const data = { any: 42 };
    const result = TriggerConditionGroupSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('strips extra fields', () => {
    const data = { all: [], extra: 'junk' };
    const parsed = TriggerConditionGroupSchema.parse(data);
    expect(parsed).not.toHaveProperty('extra');
  });

  it('handles a complex mixed group', () => {
    const data = {
      all: [
        { field: 'env', op: 'eq', value: 'production' },
        { field: 'region', op: 'neq', value: 'us-east-1' },
      ],
      any: [
        { field: 'alert_level', op: 'contains', value: 'critical' },
        { field: 'override', op: 'exists' },
      ],
    };
    const parsed = TriggerConditionGroupSchema.parse(data);
    expect(parsed.all).toHaveLength(2);
    expect(parsed.any).toHaveLength(2);
  });
});

/* ================================================================
 * TriggerFiredEventSchema
 * ================================================================ */
describe('TriggerFiredEventSchema', () => {
  it('accepts valid data', () => {
    const data = {
      type: 'trigger:fired',
      trigger_id: 't1',
      agent_id: 'a1',
      trigger_type: 'webhook',
      conversation_id: 'conv1',
      fired_at: '2026-03-11T12:00:00Z',
    };
    expect(TriggerFiredEventSchema.parse(data)).toEqual(data);
  });

  it('rejects wrong type literal', () => {
    const result = TriggerFiredEventSchema.safeParse({
      type: 'trigger:created',
      trigger_id: 't1',
      agent_id: 'a1',
      trigger_type: 'webhook',
      conversation_id: 'conv1',
      fired_at: '2026-03-11T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing trigger_id', () => {
    const result = TriggerFiredEventSchema.safeParse({
      type: 'trigger:fired',
      agent_id: 'a1',
      trigger_type: 'webhook',
      conversation_id: 'conv1',
      fired_at: '2026-03-11T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing agent_id', () => {
    const result = TriggerFiredEventSchema.safeParse({
      type: 'trigger:fired',
      trigger_id: 't1',
      trigger_type: 'webhook',
      conversation_id: 'conv1',
      fired_at: '2026-03-11T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing trigger_type', () => {
    const result = TriggerFiredEventSchema.safeParse({
      type: 'trigger:fired',
      trigger_id: 't1',
      agent_id: 'a1',
      conversation_id: 'conv1',
      fired_at: '2026-03-11T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing conversation_id', () => {
    const result = TriggerFiredEventSchema.safeParse({
      type: 'trigger:fired',
      trigger_id: 't1',
      agent_id: 'a1',
      trigger_type: 'webhook',
      fired_at: '2026-03-11T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fired_at', () => {
    const result = TriggerFiredEventSchema.safeParse({
      type: 'trigger:fired',
      trigger_id: 't1',
      agent_id: 'a1',
      trigger_type: 'webhook',
      conversation_id: 'conv1',
    });
    expect(result.success).toBe(false);
  });

  it('accepts any string for trigger_type (not restricted to enum)', () => {
    const data = {
      type: 'trigger:fired',
      trigger_id: 't1',
      agent_id: 'a1',
      trigger_type: 'custom_type',
      conversation_id: 'conv1',
      fired_at: '2026-03-11T12:00:00Z',
    };
    expect(TriggerFiredEventSchema.parse(data)).toEqual(data);
  });

  it('strips extra fields', () => {
    const data = {
      type: 'trigger:fired',
      trigger_id: 't1',
      agent_id: 'a1',
      trigger_type: 'webhook',
      conversation_id: 'conv1',
      fired_at: '2026-03-11T12:00:00Z',
      extra: 'should be stripped',
    };
    const parsed = TriggerFiredEventSchema.parse(data);
    expect(parsed).not.toHaveProperty('extra');
  });
});
