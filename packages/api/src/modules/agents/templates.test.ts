import { describe, expect, it } from 'vitest';
import { agentTemplates, getTemplate, listTemplates } from './templates.js';

describe('agentTemplates', () => {
  it('contains the expected template keys', () => {
    const keys = Object.keys(agentTemplates);
    expect(keys).toContain('pr_manager');
    expect(keys).toContain('research_assistant');
    expect(keys).toContain('creative_writer');
    expect(keys).toContain('code_helper');
    expect(keys).toContain('agent_builder');
  });

  it('every template has all required fields', () => {
    for (const [slug, template] of Object.entries(agentTemplates)) {
      expect(template.name, `${slug} missing name`).toBeTruthy();
      expect(template.description, `${slug} missing description`).toBeTruthy();
      expect(template.systemPrompt, `${slug} missing systemPrompt`).toBeTruthy();
      expect(template.model, `${slug} missing model`).toBeTruthy();
      expect(Array.isArray(template.tools), `${slug} tools not an array`).toBe(true);
      expect(Array.isArray(template.mcpServers), `${slug} mcpServers not an array`).toBe(true);
      expect(Array.isArray(template.coreMemories), `${slug} coreMemories not an array`).toBe(true);
    }
  });

  it('every template has the four SOUL memory blocks', () => {
    const requiredLabels = ['identity', 'rules', 'priorities', 'preferences'];
    for (const [slug, template] of Object.entries(agentTemplates)) {
      const labels = template.coreMemories.map((m) => m.blockLabel);
      for (const label of requiredLabels) {
        expect(labels, `${slug} missing coreMemory block "${label}"`).toContain(label);
      }
    }
  });

  it('every coreMemory has non-empty content', () => {
    for (const [slug, template] of Object.entries(agentTemplates)) {
      for (const mem of template.coreMemories) {
        expect(mem.content.length, `${slug}/${mem.blockLabel} has empty content`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it('uses valid model identifiers', () => {
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
    ];
    for (const [slug, template] of Object.entries(agentTemplates)) {
      expect(validModels, `${slug} uses invalid model ${template.model}`).toContain(template.model);
    }
  });
});

describe('getTemplate', () => {
  it('returns the correct template for a valid slug', () => {
    const template = getTemplate('pr_manager');
    expect(template.name).toBe('PR Manager');
    expect(template.model).toBe('claude-sonnet-4-6');
  });

  it('returns research_assistant template', () => {
    const template = getTemplate('research_assistant');
    expect(template.name).toBe('Research Assistant');
  });

  it('returns creative_writer template', () => {
    const template = getTemplate('creative_writer');
    expect(template.name).toBe('Creative Writer');
  });

  it('returns code_helper template', () => {
    const template = getTemplate('code_helper');
    expect(template.name).toBe('Code Helper');
  });

  it('returns agent_builder template', () => {
    const template = getTemplate('agent_builder');
    expect(template.name).toBe('Agent Builder');
    expect(template.model).toBe('claude-opus-4-6');
  });

  it('throws for an unknown slug', () => {
    expect(() => getTemplate('nonexistent')).toThrow("Agent template 'nonexistent' not found");
  });

  it('throws for an empty string slug', () => {
    expect(() => getTemplate('')).toThrow("Agent template '' not found");
  });
});

describe('listTemplates', () => {
  it('returns an array of templates with slugs', () => {
    const templates = listTemplates();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBe(Object.keys(agentTemplates).length);
  });

  it('each entry has a slug property matching the key', () => {
    const templates = listTemplates();
    const slugs = templates.map((t) => t.slug);
    for (const key of Object.keys(agentTemplates)) {
      expect(slugs).toContain(key);
    }
  });

  it('each entry contains template fields', () => {
    const templates = listTemplates();
    for (const t of templates) {
      expect(t.slug).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.systemPrompt).toBeTruthy();
      expect(t.model).toBeTruthy();
    }
  });

  it('slug + template fields match the original template', () => {
    const templates = listTemplates();
    for (const t of templates) {
      const original = agentTemplates[t.slug];
      expect(t.name).toBe(original.name);
      expect(t.description).toBe(original.description);
      expect(t.systemPrompt).toBe(original.systemPrompt);
      expect(t.model).toBe(original.model);
    }
  });
});
