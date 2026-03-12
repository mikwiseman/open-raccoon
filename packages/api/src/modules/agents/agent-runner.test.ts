import { beforeEach, describe, expect, it } from 'vitest';
import { finishAgentRun, isAgentRunning, startAgentRun, stopAgentRun } from './agent-runner.js';

/* -------------------------------------------------------------------------- */
/*  agent-runner tests                                                        */
/* -------------------------------------------------------------------------- */

describe('agent-runner', () => {
  const CONV_A = 'conv-aaaa-1111';
  const CONV_B = 'conv-bbbb-2222';
  const CONV_C = 'conv-cccc-3333';

  beforeEach(() => {
    // Clean up any state from previous tests
    stopAgentRun(CONV_A);
    stopAgentRun(CONV_B);
    stopAgentRun(CONV_C);
    finishAgentRun(CONV_A);
    finishAgentRun(CONV_B);
    finishAgentRun(CONV_C);
  });

  /* ---- startAgentRun ---- */

  it('returns an AbortSignal that is not aborted', () => {
    const signal = startAgentRun(CONV_A);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });

  it('marks the conversation as running after start', () => {
    startAgentRun(CONV_A);
    expect(isAgentRunning(CONV_A)).toBe(true);
  });

  /* ---- stopAgentRun ---- */

  it('aborts the signal when stopped', () => {
    const signal = startAgentRun(CONV_A);
    expect(signal.aborted).toBe(false);

    const stopped = stopAgentRun(CONV_A);
    expect(stopped).toBe(true);
    expect(signal.aborted).toBe(true);
  });

  it('returns false when stopping a conversation that is not running', () => {
    const stopped = stopAgentRun('non-existent');
    expect(stopped).toBe(false);
  });

  it('removes the entry after stopping', () => {
    startAgentRun(CONV_A);
    stopAgentRun(CONV_A);
    expect(isAgentRunning(CONV_A)).toBe(false);
  });

  /* ---- finishAgentRun ---- */

  it('removes the entry when finished', () => {
    startAgentRun(CONV_A);
    expect(isAgentRunning(CONV_A)).toBe(true);

    finishAgentRun(CONV_A);
    expect(isAgentRunning(CONV_A)).toBe(false);
  });

  it('does not throw when finishing a conversation that is not running', () => {
    expect(() => finishAgentRun('non-existent')).not.toThrow();
  });

  /* ---- isAgentRunning ---- */

  it('returns false for unknown conversations', () => {
    expect(isAgentRunning('never-started')).toBe(false);
  });

  it('returns true only for running conversations', () => {
    startAgentRun(CONV_A);
    startAgentRun(CONV_B);

    expect(isAgentRunning(CONV_A)).toBe(true);
    expect(isAgentRunning(CONV_B)).toBe(true);
    expect(isAgentRunning(CONV_C)).toBe(false);
  });

  /* ---- Multiple concurrent runs ---- */

  it('tracks multiple concurrent runs for different conversations', () => {
    const signalA = startAgentRun(CONV_A);
    const signalB = startAgentRun(CONV_B);
    const signalC = startAgentRun(CONV_C);

    expect(isAgentRunning(CONV_A)).toBe(true);
    expect(isAgentRunning(CONV_B)).toBe(true);
    expect(isAgentRunning(CONV_C)).toBe(true);

    // Stop only B
    stopAgentRun(CONV_B);
    expect(signalB.aborted).toBe(true);
    expect(isAgentRunning(CONV_B)).toBe(false);

    // A and C remain running
    expect(signalA.aborted).toBe(false);
    expect(signalC.aborted).toBe(false);
    expect(isAgentRunning(CONV_A)).toBe(true);
    expect(isAgentRunning(CONV_C)).toBe(true);
  });

  /* ---- Replacing existing run ---- */

  it('aborts the old signal when starting a run for an already-running conversation', () => {
    const signal1 = startAgentRun(CONV_A);
    expect(signal1.aborted).toBe(false);

    // Start a new run for the same conversation
    const signal2 = startAgentRun(CONV_A);

    // Old signal should be aborted
    expect(signal1.aborted).toBe(true);
    // New signal should be active
    expect(signal2.aborted).toBe(false);
    // Conversation should still be tracked
    expect(isAgentRunning(CONV_A)).toBe(true);
  });

  it('new signal works independently after replacing old run', () => {
    const signal1 = startAgentRun(CONV_A);
    const signal2 = startAgentRun(CONV_A);

    // Both signals exist, old one is aborted
    expect(signal1.aborted).toBe(true);
    expect(signal2.aborted).toBe(false);

    // Stopping should abort the new signal
    stopAgentRun(CONV_A);
    expect(signal2.aborted).toBe(true);
    expect(isAgentRunning(CONV_A)).toBe(false);
  });

  it('replacing a run multiple times aborts all previous signals', () => {
    const signal1 = startAgentRun(CONV_A);
    const signal2 = startAgentRun(CONV_A);
    const signal3 = startAgentRun(CONV_A);

    expect(signal1.aborted).toBe(true);
    expect(signal2.aborted).toBe(true);
    expect(signal3.aborted).toBe(false);
    expect(isAgentRunning(CONV_A)).toBe(true);
  });
});
