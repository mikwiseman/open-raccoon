import { describe, expect, it } from 'vitest';
import { MessageFeedbackSchema, RateAgentSchema } from './social.schema.js';

/* ================================================================
 * RateAgentSchema
 * ================================================================ */
describe('RateAgentSchema', () => {
  it('accepts a valid minimal rating', () => {
    const data = { rating: 4 };
    expect(RateAgentSchema.parse(data)).toEqual(data);
  });

  it('accepts a fully specified rating', () => {
    const data = {
      rating: 5,
      review: 'Excellent agent!',
      accuracy_score: 5,
      helpfulness_score: 4,
      speed_score: 3,
      conversation_id: '550e8400-e29b-41d4-a716-446655440000',
      message_id: '550e8400-e29b-41d4-a716-446655440001',
    };
    const result = RateAgentSchema.parse(data);
    expect(result.rating).toBe(5);
    expect(result.review).toBe('Excellent agent!');
    expect(result.accuracy_score).toBe(5);
  });

  it('rejects rating below 1', () => {
    const result = RateAgentSchema.safeParse({ rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = RateAgentSchema.safeParse({ rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = RateAgentSchema.safeParse({ rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it('accepts rating at boundary values (1 and 5)', () => {
    expect(RateAgentSchema.parse({ rating: 1 }).rating).toBe(1);
    expect(RateAgentSchema.parse({ rating: 5 }).rating).toBe(5);
  });

  it('rejects review longer than 2000 characters', () => {
    const result = RateAgentSchema.safeParse({ rating: 3, review: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('accepts review at exactly 2000 characters', () => {
    const result = RateAgentSchema.parse({ rating: 3, review: 'a'.repeat(2000) });
    expect(result.review).toBe('a'.repeat(2000));
  });

  it('rejects sub-scores below 1', () => {
    expect(RateAgentSchema.safeParse({ rating: 3, accuracy_score: 0 }).success).toBe(false);
    expect(RateAgentSchema.safeParse({ rating: 3, helpfulness_score: 0 }).success).toBe(false);
    expect(RateAgentSchema.safeParse({ rating: 3, speed_score: 0 }).success).toBe(false);
  });

  it('rejects sub-scores above 5', () => {
    expect(RateAgentSchema.safeParse({ rating: 3, accuracy_score: 6 }).success).toBe(false);
    expect(RateAgentSchema.safeParse({ rating: 3, helpfulness_score: 6 }).success).toBe(false);
    expect(RateAgentSchema.safeParse({ rating: 3, speed_score: 6 }).success).toBe(false);
  });

  it('rejects non-integer sub-scores', () => {
    expect(RateAgentSchema.safeParse({ rating: 3, accuracy_score: 2.5 }).success).toBe(false);
  });

  it('rejects invalid UUID for conversation_id', () => {
    const result = RateAgentSchema.safeParse({ rating: 3, conversation_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for message_id', () => {
    const result = RateAgentSchema.safeParse({ rating: 3, message_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing rating', () => {
    const result = RateAgentSchema.safeParse({ review: 'Nice' });
    expect(result.success).toBe(false);
  });
});

/* ================================================================
 * MessageFeedbackSchema
 * ================================================================ */
describe('MessageFeedbackSchema', () => {
  it('accepts positive feedback without reason', () => {
    const data = { feedback: 'positive' as const };
    expect(MessageFeedbackSchema.parse(data)).toEqual(data);
  });

  it('accepts negative feedback with reason', () => {
    const data = { feedback: 'negative' as const, reason: 'too_verbose' };
    expect(MessageFeedbackSchema.parse(data)).toEqual(data);
  });

  it('rejects invalid feedback value', () => {
    const result = MessageFeedbackSchema.safeParse({ feedback: 'neutral' });
    expect(result.success).toBe(false);
  });

  it('rejects missing feedback', () => {
    const result = MessageFeedbackSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects reason longer than 30 characters', () => {
    const result = MessageFeedbackSchema.safeParse({
      feedback: 'negative',
      reason: 'a'.repeat(31),
    });
    expect(result.success).toBe(false);
  });

  it('accepts reason at exactly 30 characters', () => {
    const result = MessageFeedbackSchema.parse({
      feedback: 'negative',
      reason: 'a'.repeat(30),
    });
    expect(result.reason).toBe('a'.repeat(30));
  });

  it('accepts feedback without reason', () => {
    const result = MessageFeedbackSchema.parse({ feedback: 'positive' });
    expect(result.reason).toBeUndefined();
  });
});
