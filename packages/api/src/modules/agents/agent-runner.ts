/**
 * Tracks running agent loops and their AbortControllers so that
 * agent:stop events can actually cancel in-flight agent executions.
 */

// conversationId → AbortController for the running agent loop
const runningAgents = new Map<string, AbortController>();

/**
 * Register a new agent run. Returns an AbortSignal the loop should respect.
 * If an agent loop is already running for this conversation, it is aborted first.
 */
export function startAgentRun(conversationId: string): AbortSignal {
  // Cancel any existing run for this conversation
  const existing = runningAgents.get(conversationId);
  if (existing) {
    existing.abort();
  }

  const controller = new AbortController();
  runningAgents.set(conversationId, controller);
  return controller.signal;
}

/**
 * Stop a running agent loop for the given conversation.
 * Returns true if there was a running loop to stop.
 */
export function stopAgentRun(conversationId: string): boolean {
  const controller = runningAgents.get(conversationId);
  if (!controller) return false;

  controller.abort();
  runningAgents.delete(conversationId);
  return true;
}

/**
 * Clean up after an agent loop completes (success or failure).
 * Called from finally blocks in the loop callers.
 */
export function finishAgentRun(conversationId: string): void {
  runningAgents.delete(conversationId);
}

/**
 * Check if an agent loop is currently running for a conversation.
 */
export function isAgentRunning(conversationId: string): boolean {
  return runningAgents.has(conversationId);
}
