import { Hono } from 'hono';
import { authMiddleware } from '../auth/auth.middleware.js';
import { ExecuteWorkflowSchema } from './workflow-orchestrator.schema.js';
import {
  cancelWorkflowRun,
  executeWorkflowRun,
  getWorkflowRunStatus,
  listWorkflowRuns,
  retryFailedStep,
} from './workflow-orchestrator.service.js';

export const orchestratorRoutes = new Hono();

// POST /workflows/:id/execute — Start a workflow run
orchestratorRoutes.post('/workflows/:id/execute', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const workflowId = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = ExecuteWorkflowSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }

  try {
    const result = await executeWorkflowRun(workflowId, userId, parsed.data.input ?? {});
    return c.json({ run: result }, 202);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});

// GET /workflows/runs/:runId — Get run status
orchestratorRoutes.get('/workflows/runs/:runId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const runId = c.req.param('runId');

  try {
    const run = await getWorkflowRunStatus(runId, userId);
    return c.json({ run }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// POST /workflows/runs/:runId/cancel — Cancel a run
orchestratorRoutes.post('/workflows/runs/:runId/cancel', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const runId = c.req.param('runId');

  try {
    await cancelWorkflowRun(runId, userId);
    return c.json({ ok: true }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});

// POST /workflows/runs/:runId/steps/:stepIndex/retry — Retry a failed step
orchestratorRoutes.post(
  '/workflows/runs/:runId/steps/:stepIndex/retry',
  authMiddleware,
  async (c) => {
    const userId = c.get('userId');
    const runId = c.req.param('runId');
    const stepIndex = Number(c.req.param('stepIndex'));

    if (!Number.isInteger(stepIndex) || stepIndex < 0) {
      return c.json(
        { error: 'Bad request', message: 'stepIndex must be a non-negative integer' },
        400,
      );
    }

    try {
      const result = await retryFailedStep(runId, stepIndex, userId);
      return c.json({ step_result: result }, 200);
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
      if (e.code === 'BAD_REQUEST')
        return c.json({ error: 'Bad request', message: e.message }, 400);
      throw err;
    }
  },
);

// GET /workflows/:id/runs — List runs for a workflow
orchestratorRoutes.get('/workflows/:id/runs', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const workflowId = c.req.param('id');

  try {
    const runs = await listWorkflowRuns(workflowId, userId);
    return c.json({ runs }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});
