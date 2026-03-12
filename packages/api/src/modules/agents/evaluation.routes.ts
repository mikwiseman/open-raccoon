import { Hono } from 'hono';
import { authMiddleware } from '../auth/auth.middleware.js';
import {
  CreateEvalSuiteSchema,
  CreateTestCaseSchema,
  RunEvaluationSchema,
  UpdateEvalSuiteSchema,
  UpdateTestCaseSchema,
} from './evaluation.schema.js';
import {
  createSuite,
  createTestCase,
  deleteSuite,
  deleteTestCase,
  getLeaderboard,
  getRun,
  getSuite,
  listRuns,
  listSuites,
  listTestCases,
  runEvaluation,
  updateSuite,
  updateTestCase,
} from './evaluation.service.js';

export const evaluationRoutes = new Hono();

// ---------- Leaderboard ----------

// GET /agents/leaderboard — rank agents by eval scores
evaluationRoutes.get('/leaderboard', authMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    const leaderboard = await getLeaderboard(userId);
    return c.json({ leaderboard }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// ---------- Suite CRUD ----------

// GET /agents/:agentId/eval-suites — list eval suites for an agent
evaluationRoutes.get('/:agentId/eval-suites', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('agentId');
  try {
    const suites = await listSuites(agentId, userId);
    return c.json({ suites }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// POST /agents/:agentId/eval-suites — create eval suite
evaluationRoutes.post('/:agentId/eval-suites', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('agentId');
  const body = await c.req.json().catch(() => null);
  const parsed = CreateEvalSuiteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const suite = await createSuite(agentId, userId, parsed.data);
    return c.json({ suite }, 201);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});

// GET /agents/:agentId/eval-suites/:suiteId — get eval suite (includes test cases)
evaluationRoutes.get('/:agentId/eval-suites/:suiteId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const suiteId = c.req.param('suiteId');
  try {
    const suite = await getSuite(suiteId, userId);
    return c.json({ suite }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// PATCH /agents/:agentId/eval-suites/:suiteId — update eval suite
evaluationRoutes.patch('/:agentId/eval-suites/:suiteId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const suiteId = c.req.param('suiteId');
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateEvalSuiteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const suite = await updateSuite(suiteId, userId, parsed.data);
    return c.json({ suite }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});

// DELETE /agents/:agentId/eval-suites/:suiteId — delete eval suite
evaluationRoutes.delete('/:agentId/eval-suites/:suiteId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const suiteId = c.req.param('suiteId');
  try {
    await deleteSuite(suiteId, userId);
    return c.json({ ok: true }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// ---------- Test Case CRUD ----------

// GET /agents/:agentId/eval-suites/:suiteId/test-cases — list test cases
evaluationRoutes.get('/:agentId/eval-suites/:suiteId/test-cases', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const suiteId = c.req.param('suiteId');
  try {
    const test_cases = await listTestCases(suiteId, userId);
    return c.json({ test_cases }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// POST /agents/:agentId/eval-suites/:suiteId/test-cases — create test case
evaluationRoutes.post('/:agentId/eval-suites/:suiteId/test-cases', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const suiteId = c.req.param('suiteId');
  const body = await c.req.json().catch(() => null);
  const parsed = CreateTestCaseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const test_case = await createTestCase(suiteId, userId, parsed.data);
    return c.json({ test_case }, 201);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});

// PATCH /agents/:agentId/eval-suites/:suiteId/test-cases/:caseId — update test case
evaluationRoutes.patch(
  '/:agentId/eval-suites/:suiteId/test-cases/:caseId',
  authMiddleware,
  async (c) => {
    const userId = c.get('userId');
    const caseId = c.req.param('caseId');
    const body = await c.req.json().catch(() => null);
    const parsed = UpdateTestCaseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
    }
    try {
      const test_case = await updateTestCase(caseId, userId, parsed.data);
      return c.json({ test_case }, 200);
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
      if (e.code === 'BAD_REQUEST')
        return c.json({ error: 'Bad request', message: e.message }, 400);
      throw err;
    }
  },
);

// DELETE /agents/:agentId/eval-suites/:suiteId/test-cases/:caseId — delete test case
evaluationRoutes.delete(
  '/:agentId/eval-suites/:suiteId/test-cases/:caseId',
  authMiddleware,
  async (c) => {
    const userId = c.get('userId');
    const caseId = c.req.param('caseId');
    try {
      await deleteTestCase(caseId, userId);
      return c.json({ ok: true }, 200);
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
      throw err;
    }
  },
);

// ---------- Run Operations ----------

// POST /agents/:agentId/eval-suites/:suiteId/run — execute evaluation
evaluationRoutes.post('/:agentId/eval-suites/:suiteId/run', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('agentId');
  const suiteId = c.req.param('suiteId');
  const body = await c.req.json().catch(() => null);
  const parsed = RunEvaluationSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const run = await runEvaluation(suiteId, agentId, userId, parsed.data);
    return c.json({ run }, 202);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});

// GET /agents/:agentId/eval-suites/:suiteId/runs — list runs
evaluationRoutes.get('/:agentId/eval-suites/:suiteId/runs', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const suiteId = c.req.param('suiteId');
  try {
    const runs = await listRuns(suiteId, userId);
    return c.json({ runs }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// GET /agents/:agentId/eval-suites/:suiteId/runs/:runId — get run with results
evaluationRoutes.get('/:agentId/eval-suites/:suiteId/runs/:runId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const runId = c.req.param('runId');
  try {
    const run = await getRun(runId, userId);
    return c.json({ run }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});
