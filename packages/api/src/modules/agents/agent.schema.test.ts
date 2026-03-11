import { describe, expect, it } from 'vitest';
import { CreateAgentSchema, UpdateAgentSchema } from './agent.schema.js';

/* ================================================================
 * CreateAgentSchema
 * ================================================================ */
describe('CreateAgentSchema', () => {
  const validAgent = {
    name: 'My Agent',
    system_prompt: 'You are a helpful assistant.',
    model: 'claude-sonnet-4-6' as const,
  };

  it('accepts a minimal valid agent', () => {
    const result = CreateAgentSchema.parse(validAgent);
    expect(result.name).toBe('My Agent');
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('accepts a fully specified agent', () => {
    const data = {
      ...validAgent,
      template: 'research_assistant',
      description: 'A research bot',
      visibility: 'public' as const,
      category: 'research',
      temperature: 0.7,
      max_tokens: 4096,
      tools: [{ name: 'search', description: 'Search the web' }],
      mcp_servers: [{ url: 'https://mcp.example.com', name: 'Memory MCP' }],
    };
    const result = CreateAgentSchema.parse(data);
    expect(result.visibility).toBe('public');
    expect(result.temperature).toBe(0.7);
    expect(result.max_tokens).toBe(4096);
    expect(result.tools).toHaveLength(1);
    expect(result.mcp_servers).toHaveLength(1);
  });

  it('strips HTML from name', () => {
    const data = { ...validAgent, name: '<b>Bold Agent</b>' };
    const result = CreateAgentSchema.parse(data);
    expect(result.name).toBe('Bold Agent');
  });

  it('strips HTML from description', () => {
    const data = { ...validAgent, description: '<script>alert("xss")</script>Safe desc' };
    const result = CreateAgentSchema.parse(data);
    expect(result.description).toBe('alert("xss")Safe desc');
  });

  it('rejects empty name', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 64 characters', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, name: 'a'.repeat(65) });
    expect(result.success).toBe(false);
  });

  it('rejects system_prompt longer than 50000 characters', () => {
    const result = CreateAgentSchema.safeParse({
      ...validAgent,
      system_prompt: 'x'.repeat(50001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid model values', () => {
    const validModels = [
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-haiku-4-5-20251001',
      'gpt-4o',
      'gpt-4o-mini',
      'o1',
      'o3',
      'o3-mini',
      'o4-mini',
    ] as const;
    for (const model of validModels) {
      const result = CreateAgentSchema.safeParse({ ...validAgent, model });
      expect(result.success, `Model ${model} should be accepted`).toBe(true);
    }
  });

  it('rejects an invalid model', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, model: 'gpt-3' });
    expect(result.success).toBe(false);
  });

  it('rejects temperature below 0', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, temperature: -0.1 });
    expect(result.success).toBe(false);
  });

  it('rejects temperature above 2', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, temperature: 2.1 });
    expect(result.success).toBe(false);
  });

  it('accepts temperature at boundary values', () => {
    expect(CreateAgentSchema.parse({ ...validAgent, temperature: 0 }).temperature).toBe(0);
    expect(CreateAgentSchema.parse({ ...validAgent, temperature: 2 }).temperature).toBe(2);
  });

  it('rejects max_tokens below 1', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, max_tokens: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects max_tokens above 200000', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, max_tokens: 200001 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer max_tokens', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, max_tokens: 100.5 });
    expect(result.success).toBe(false);
  });

  it('accepts valid visibility values', () => {
    for (const v of ['public', 'private', 'unlisted'] as const) {
      const result = CreateAgentSchema.safeParse({ ...validAgent, visibility: v });
      expect(result.success, `Visibility "${v}" should be accepted`).toBe(true);
    }
  });

  it('rejects invalid visibility', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, visibility: 'hidden' });
    expect(result.success).toBe(false);
  });

  it('rejects mcp_server with invalid URL', () => {
    const result = CreateAgentSchema.safeParse({
      ...validAgent,
      mcp_servers: [{ url: 'not-a-url', name: 'test' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = CreateAgentSchema.safeParse({ model: 'claude-sonnet-4-6' });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * UpdateAgentSchema
 * ================================================================ */
describe('UpdateAgentSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(UpdateAgentSchema.parse({})).toEqual({});
  });

  it('accepts partial updates', () => {
    const result = UpdateAgentSchema.parse({ name: 'Updated Name' });
    expect(result.name).toBe('Updated Name');
  });

  it('strips HTML from name', () => {
    const result = UpdateAgentSchema.parse({ name: '<em>New</em>' });
    expect(result.name).toBe('New');
  });

  it('accepts avatar_url for update', () => {
    const result = UpdateAgentSchema.parse({ avatar_url: 'https://example.com/new-avatar.png' });
    expect(result.avatar_url).toBe('https://example.com/new-avatar.png');
  });

  it('rejects invalid avatar_url', () => {
    const result = UpdateAgentSchema.safeParse({ avatar_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 64 characters', () => {
    const result = UpdateAgentSchema.safeParse({ name: 'a'.repeat(65) });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = UpdateAgentSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
