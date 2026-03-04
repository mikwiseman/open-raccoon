import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assembleSoulPrompt } from '../soul.js';

vi.mock('../../../db/connection.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  sql: vi.fn(),
}));

vi.mock('../../../db/schema/agents.js', () => ({
  agentCoreMemories: { agentId: 'agent_id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ eq: true })),
}));

vi.mock('../agent.service.js', () => ({
  getCompactPerformanceInsight: vi.fn().mockResolvedValue(null),
}));

import { db } from '../../../db/connection.js';

const mockMemories = [
  { blockLabel: 'identity', content: 'I am an AI assistant.' },
  { blockLabel: 'rules', content: 'Never lie.' },
  { blockLabel: 'priorities', content: '1. Safety\n2. Helpfulness' },
  { blockLabel: 'preferences', content: 'Be concise.' },
];

describe('assembleSoulPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a prompt with all four SOUL blocks in order', async () => {
    const dbMock = db as any;
    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockMemories),
      }),
    });

    const prompt = await assembleSoulPrompt('agent-1', 'user-1');

    expect(prompt).toContain('[Identity]');
    expect(prompt).toContain('I am an AI assistant.');
    expect(prompt).toContain('[Rules]');
    expect(prompt).toContain('Never lie.');
    expect(prompt).toContain('[Priorities]');
    expect(prompt).toContain('1. Safety');
    expect(prompt).toContain('[Preferences]');
    expect(prompt).toContain('Be concise.');

    // Identity should appear before Rules
    const identityIdx = prompt.indexOf('[Identity]');
    const rulesIdx = prompt.indexOf('[Rules]');
    expect(identityIdx).toBeLessThan(rulesIdx);
  });

  it('includes [Context] block with current date and userId', async () => {
    const dbMock = db as any;
    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const prompt = await assembleSoulPrompt('agent-1', 'user-42');

    expect(prompt).toContain('[Context]');
    expect(prompt).toContain('user-42');
    expect(prompt).toMatch(/Current date: \d{4}-\d{2}-\d{2}/);
  });

  it('omits missing blocks gracefully', async () => {
    const dbMock = db as any;
    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { blockLabel: 'identity', content: 'I am here.' },
        ]),
      }),
    });

    const prompt = await assembleSoulPrompt('agent-1', 'user-1');

    expect(prompt).toContain('[Identity]');
    expect(prompt).not.toContain('[Rules]');
    expect(prompt).not.toContain('[Priorities]');
    expect(prompt).not.toContain('[Preferences]');
  });

  it('ignores unknown block labels', async () => {
    const dbMock = db as any;
    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { blockLabel: 'unknown_label', content: 'Should be ignored.' },
          { blockLabel: 'identity', content: 'I exist.' },
        ]),
      }),
    });

    const prompt = await assembleSoulPrompt('agent-1', 'user-1');

    expect(prompt).toContain('[Identity]');
    expect(prompt).not.toContain('Should be ignored.');
  });
});
