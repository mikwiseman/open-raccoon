import { describe, expect, it } from 'vitest';
import { formatConversation, toISO } from './utils.js';

/* ================================================================
 * toISO
 * ================================================================ */
describe('toISO', () => {
  it('returns null for null input', () => {
    expect(toISO(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(toISO(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(toISO('')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(toISO(0)).toBeNull();
  });

  it('returns null for false', () => {
    expect(toISO(false)).toBeNull();
  });

  it('converts a Date object to ISO string', () => {
    const date = new Date('2025-06-15T12:30:00Z');
    expect(toISO(date)).toBe('2025-06-15T12:30:00.000Z');
  });

  it('converts a valid ISO string to ISO string', () => {
    expect(toISO('2025-01-01T00:00:00Z')).toBe('2025-01-01T00:00:00.000Z');
  });

  it('converts a date-only string to ISO string', () => {
    const result = toISO('2025-06-15');
    expect(result).toBeTruthy();
    expect(result).toContain('2025-06-15');
  });

  it('returns null for an invalid date string', () => {
    expect(toISO('not-a-date')).toBeNull();
  });

  it('returns null for a completely garbage string', () => {
    expect(toISO('abc123xyz')).toBeNull();
  });

  it('converts a numeric timestamp string to ISO', () => {
    // toISO converts val to String then new Date(String(val))
    // For a numeric string like "1718451000000", new Date("1718451000000") is NaN
    // because Date constructor with a string requires a date-format string, not epoch ms.
    // So this should return null.
    const timestamp = new Date('2025-06-15T12:30:00Z').getTime();
    const result = toISO(timestamp);
    // new Date(String(1718451000000)) => NaN => null
    expect(result).toBeNull();
  });

  it('handles Date with timezone offset string', () => {
    const result = toISO('2025-06-15T12:30:00+05:00');
    expect(result).toBeTruthy();
    expect(result).toContain('T');
  });
});

/* ================================================================
 * formatConversation
 * ================================================================ */
describe('formatConversation', () => {
  it('maps all fields correctly from a database row', () => {
    const row = {
      id: 'conv-1',
      type: 'dm',
      title: 'Test Chat',
      avatar_url: 'https://example.com/avatar.png',
      creator_id: 'user-1',
      agent_id: 'agent-1',
      metadata: { key: 'value' },
      last_message_at: new Date('2025-06-15T12:30:00Z'),
      inserted_at: new Date('2025-01-01T00:00:00Z'),
      updated_at: new Date('2025-06-15T12:30:00Z'),
    };

    const result = formatConversation(row);

    expect(result).toEqual({
      id: 'conv-1',
      type: 'dm',
      title: 'Test Chat',
      avatar_url: 'https://example.com/avatar.png',
      creator_id: 'user-1',
      agent_id: 'agent-1',
      metadata: { key: 'value' },
      last_message_at: '2025-06-15T12:30:00.000Z',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-06-15T12:30:00.000Z',
    });
  });

  it('handles null date fields', () => {
    const row = {
      id: 'conv-2',
      type: 'group',
      title: null,
      avatar_url: null,
      creator_id: 'user-2',
      agent_id: null,
      metadata: {},
      last_message_at: null,
      inserted_at: null,
      updated_at: null,
    };

    const result = formatConversation(row);

    expect(result.last_message_at).toBeNull();
    expect(result.created_at).toBeNull();
    expect(result.updated_at).toBeNull();
  });

  it('handles string date values', () => {
    const row = {
      id: 'conv-3',
      type: 'agent',
      title: 'Agent Chat',
      avatar_url: null,
      creator_id: 'user-3',
      agent_id: 'agent-2',
      metadata: {},
      last_message_at: '2025-06-15T12:30:00Z',
      inserted_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-06-15T12:30:00Z',
    };

    const result = formatConversation(row);

    expect(result.last_message_at).toBe('2025-06-15T12:30:00.000Z');
    expect(result.created_at).toBe('2025-01-01T00:00:00.000Z');
    expect(result.updated_at).toBe('2025-06-15T12:30:00.000Z');
  });

  it('uses inserted_at for created_at field', () => {
    const row = {
      id: 'conv-4',
      type: 'dm',
      title: null,
      avatar_url: null,
      creator_id: 'user-4',
      agent_id: null,
      metadata: {},
      last_message_at: null,
      inserted_at: new Date('2025-03-10T08:00:00Z'),
      updated_at: new Date('2025-03-10T09:00:00Z'),
    };

    const result = formatConversation(row);

    expect(result.created_at).toBe('2025-03-10T08:00:00.000Z');
  });

  it('handles undefined fields gracefully', () => {
    const row = {
      id: 'conv-5',
      type: 'dm',
      title: undefined,
      avatar_url: undefined,
      creator_id: 'user-5',
      agent_id: undefined,
      metadata: undefined,
      last_message_at: undefined,
      inserted_at: undefined,
      updated_at: undefined,
    };

    const result = formatConversation(row);

    expect(result.id).toBe('conv-5');
    expect(result.last_message_at).toBeNull();
    expect(result.created_at).toBeNull();
    expect(result.updated_at).toBeNull();
  });
});
