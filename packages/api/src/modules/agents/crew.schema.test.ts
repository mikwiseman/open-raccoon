import { describe, expect, it } from 'vitest';
import { CreateCrewSchema, RunCrewSchema, UpdateCrewSchema } from './crew.schema.js';

const validStep = {
  agentId: '550e8400-e29b-41d4-a716-446655440000',
  role: 'researcher',
};

/* ================================================================
 * CreateCrewSchema
 * ================================================================ */
describe('CreateCrewSchema', () => {
  it('accepts a valid minimal crew', () => {
    const data = { name: 'Research Crew', steps: [validStep] };
    const result = CreateCrewSchema.parse(data);
    expect(result.name).toBe('Research Crew');
    expect(result.steps).toHaveLength(1);
  });

  it('accepts a fully specified crew', () => {
    const data = {
      name: 'Full Crew',
      description: 'A research team',
      steps: [validStep, { ...validStep, role: 'writer', parallelGroup: 'group1' }],
      visibility: 'public' as const,
      category: 'research',
    };
    const result = CreateCrewSchema.parse(data);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[1].parallelGroup).toBe('group1');
  });

  it('strips HTML from name', () => {
    const result = CreateCrewSchema.parse({
      name: '<script>alert("xss")</script>Clean',
      steps: [validStep],
    });
    expect(result.name).toBe('alert("xss")Clean');
  });

  it('strips HTML from description', () => {
    const result = CreateCrewSchema.parse({
      name: 'Crew',
      description: '<b>Bold</b> desc',
      steps: [validStep],
    });
    expect(result.description).toBe('Bold desc');
  });

  it('rejects empty name', () => {
    const result = CreateCrewSchema.safeParse({ name: '', steps: [validStep] });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 64 characters', () => {
    const result = CreateCrewSchema.safeParse({ name: 'a'.repeat(65), steps: [validStep] });
    expect(result.success).toBe(false);
  });

  it('rejects empty steps array', () => {
    const result = CreateCrewSchema.safeParse({ name: 'Crew', steps: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 5 steps', () => {
    const steps = Array.from({ length: 6 }, (_, i) => ({
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: `role${i}`,
    }));
    const result = CreateCrewSchema.safeParse({ name: 'Crew', steps });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 5 steps', () => {
    const steps = Array.from({ length: 5 }, (_, i) => ({
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      role: `role${i}`,
    }));
    const result = CreateCrewSchema.safeParse({ name: 'Crew', steps });
    expect(result.success).toBe(true);
  });

  it('rejects step with invalid UUID for agentId', () => {
    const result = CreateCrewSchema.safeParse({
      name: 'Crew',
      steps: [{ agentId: 'not-a-uuid', role: 'researcher' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects step with empty role', () => {
    const result = CreateCrewSchema.safeParse({
      name: 'Crew',
      steps: [{ agentId: '550e8400-e29b-41d4-a716-446655440000', role: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects step with role longer than 64 characters', () => {
    const result = CreateCrewSchema.safeParse({
      name: 'Crew',
      steps: [{ agentId: '550e8400-e29b-41d4-a716-446655440000', role: 'r'.repeat(65) }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects parallelGroup longer than 32 characters', () => {
    const result = CreateCrewSchema.safeParse({
      name: 'Crew',
      steps: [{ ...validStep, parallelGroup: 'g'.repeat(33) }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid visibility', () => {
    const result = CreateCrewSchema.safeParse({
      name: 'Crew',
      steps: [validStep],
      visibility: 'hidden',
    });
    expect(result.success).toBe(false);
  });

  it('rejects category longer than 32 characters', () => {
    const result = CreateCrewSchema.safeParse({
      name: 'Crew',
      steps: [validStep],
      category: 'c'.repeat(33),
    });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * UpdateCrewSchema
 * ================================================================ */
describe('UpdateCrewSchema', () => {
  it('accepts an empty update', () => {
    expect(UpdateCrewSchema.parse({})).toEqual({});
  });

  it('accepts a name-only update', () => {
    const result = UpdateCrewSchema.parse({ name: 'Updated Crew' });
    expect(result.name).toBe('Updated Crew');
  });

  it('strips HTML from updated name', () => {
    const result = UpdateCrewSchema.parse({ name: '<i>Italic</i>' });
    expect(result.name).toBe('Italic');
  });

  it('accepts steps update', () => {
    const result = UpdateCrewSchema.parse({ steps: [validStep] });
    expect(result.steps).toHaveLength(1);
  });

  it('rejects empty steps in update', () => {
    const result = UpdateCrewSchema.safeParse({ steps: [] });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * RunCrewSchema
 * ================================================================ */
describe('RunCrewSchema', () => {
  it('accepts a valid run request', () => {
    const data = {
      conversation_id: '550e8400-e29b-41d4-a716-446655440000',
      message: 'Analyze this topic',
    };
    const result = RunCrewSchema.parse(data);
    expect(result.conversation_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(result.message).toBe('Analyze this topic');
  });

  it('rejects invalid UUID for conversation_id', () => {
    const result = RunCrewSchema.safeParse({
      conversation_id: 'not-a-uuid',
      message: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty message', () => {
    const result = RunCrewSchema.safeParse({
      conversation_id: '550e8400-e29b-41d4-a716-446655440000',
      message: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects message longer than 100000 characters', () => {
    const result = RunCrewSchema.safeParse({
      conversation_id: '550e8400-e29b-41d4-a716-446655440000',
      message: 'x'.repeat(100001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts message at exactly 100000 characters', () => {
    const result = RunCrewSchema.safeParse({
      conversation_id: '550e8400-e29b-41d4-a716-446655440000',
      message: 'x'.repeat(100000),
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing conversation_id', () => {
    const result = RunCrewSchema.safeParse({ message: 'Hello' });
    expect(result.success).toBe(false);
  });

  it('rejects missing message', () => {
    const result = RunCrewSchema.safeParse({
      conversation_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });
});
