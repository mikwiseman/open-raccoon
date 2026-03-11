import { describe, expect, it } from 'vitest';
import { CreateTriggerSchema, UpdateTriggerSchema } from './trigger.schema.js';

/* ================================================================
 * CreateTriggerSchema
 * ================================================================ */
describe('CreateTriggerSchema', () => {
  it('accepts a valid minimal webhook trigger', () => {
    const data = { name: 'GitHub Push', trigger_type: 'webhook' as const };
    const result = CreateTriggerSchema.parse(data);
    expect(result.name).toBe('GitHub Push');
    expect(result.trigger_type).toBe('webhook');
  });

  it('accepts a fully specified trigger', () => {
    const data = {
      name: 'PR Opened',
      trigger_type: 'webhook' as const,
      hmac_secret: 'my-secret',
      condition_filter: {
        all: [{ field: 'action', op: 'eq' as const, value: 'opened' }],
      },
      message_template: 'New PR: {{title}}',
      cron_expression: '0 */6 * * *',
      enabled: true,
      metadata: { source: 'github' },
    };
    const result = CreateTriggerSchema.parse(data);
    expect(result.hmac_secret).toBe('my-secret');
    expect(result.condition_filter?.all).toHaveLength(1);
    expect(result.metadata).toEqual({ source: 'github' });
  });

  it('strips HTML from name', () => {
    const result = CreateTriggerSchema.parse({
      name: '<b>Trigger</b>',
      trigger_type: 'webhook',
    });
    expect(result.name).toBe('Trigger');
  });

  it('rejects empty name', () => {
    const result = CreateTriggerSchema.safeParse({ name: '', trigger_type: 'webhook' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 64 characters', () => {
    const result = CreateTriggerSchema.safeParse({
      name: 'a'.repeat(65),
      trigger_type: 'webhook',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid trigger types', () => {
    for (const tt of ['webhook', 'schedule', 'condition'] as const) {
      const result = CreateTriggerSchema.safeParse({ name: 'Test', trigger_type: tt });
      expect(result.success, `trigger_type "${tt}" should be accepted`).toBe(true);
    }
  });

  it('rejects invalid trigger type', () => {
    const result = CreateTriggerSchema.safeParse({ name: 'Test', trigger_type: 'email' });
    expect(result.success).toBe(false);
  });

  it('rejects hmac_secret longer than 128 characters', () => {
    const result = CreateTriggerSchema.safeParse({
      name: 'Test',
      trigger_type: 'webhook',
      hmac_secret: 's'.repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it('rejects message_template longer than 10000 characters', () => {
    const result = CreateTriggerSchema.safeParse({
      name: 'Test',
      trigger_type: 'webhook',
      message_template: 'x'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects cron_expression longer than 32 characters', () => {
    const result = CreateTriggerSchema.safeParse({
      name: 'Test',
      trigger_type: 'schedule',
      cron_expression: 'x'.repeat(33),
    });
    expect(result.success).toBe(false);
  });

  it('validates condition_filter shape', () => {
    const result = CreateTriggerSchema.safeParse({
      name: 'Test',
      trigger_type: 'condition',
      condition_filter: {
        all: [{ field: 'status', op: 'eq', value: 'active' }],
        any: [{ field: 'label', op: 'contains', value: 'bug' }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects condition_filter with invalid op', () => {
    const result = CreateTriggerSchema.safeParse({
      name: 'Test',
      trigger_type: 'condition',
      condition_filter: {
        all: [{ field: 'status', op: 'regex', value: '.*' }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects condition_filter with empty field', () => {
    const result = CreateTriggerSchema.safeParse({
      name: 'Test',
      trigger_type: 'condition',
      condition_filter: {
        all: [{ field: '', op: 'eq', value: 'test' }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = CreateTriggerSchema.safeParse({ trigger_type: 'webhook' });
    expect(result.success).toBe(false);
  });

  it('rejects missing trigger_type', () => {
    const result = CreateTriggerSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * UpdateTriggerSchema
 * ================================================================ */
describe('UpdateTriggerSchema', () => {
  it('accepts an empty update', () => {
    expect(UpdateTriggerSchema.parse({})).toEqual({});
  });

  it('accepts a name-only update', () => {
    const result = UpdateTriggerSchema.parse({ name: 'New Name' });
    expect(result.name).toBe('New Name');
  });

  it('strips HTML from updated name', () => {
    const result = UpdateTriggerSchema.parse({ name: '<em>Updated</em>' });
    expect(result.name).toBe('Updated');
  });

  it('accepts null for nullable fields', () => {
    const result = UpdateTriggerSchema.parse({
      hmac_secret: null,
      condition_filter: null,
      message_template: null,
      cron_expression: null,
    });
    expect(result.hmac_secret).toBeNull();
    expect(result.condition_filter).toBeNull();
    expect(result.message_template).toBeNull();
    expect(result.cron_expression).toBeNull();
  });

  it('accepts enabled boolean', () => {
    const result = UpdateTriggerSchema.parse({ enabled: false });
    expect(result.enabled).toBe(false);
  });

  it('accepts metadata record', () => {
    const result = UpdateTriggerSchema.parse({ metadata: { key: 'value' } });
    expect(result.metadata).toEqual({ key: 'value' });
  });

  it('rejects empty name', () => {
    const result = UpdateTriggerSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects hmac_secret longer than 128 characters', () => {
    const result = UpdateTriggerSchema.safeParse({ hmac_secret: 's'.repeat(129) });
    expect(result.success).toBe(false);
  });
});
