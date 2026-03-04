import { Hono } from 'hono';
import { authMiddleware } from '../auth/auth.middleware.js';
import { CreateAgentSchema, UpdateAgentSchema } from './agent.schema.js';
import {
  listAgents,
  createAgent,
  getAgent,
  updateAgent,
  deleteAgent,
  startConversation,
  getAgentPerformance,
} from './agent.service.js';
import { listTemplates } from './templates.js';

export const agentRoutes = new Hono();

// GET /templates — list available agent templates
agentRoutes.get('/templates', authMiddleware, async (c) => {
  const templates = listTemplates();
  return c.json({ templates }, 200);
});

// GET / — list user's agents
agentRoutes.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const agents = await listAgents(userId);
  return c.json({ agents }, 200);
});

// POST / — create agent
agentRoutes.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = CreateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const agent = await createAgent(userId, parsed.data);
    return c.json({ agent }, 201);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});

// GET /:id — get agent with SOUL
agentRoutes.get('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');
  try {
    const agent = await getAgent(agentId, userId);
    return c.json({ agent }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// PATCH /:id — update agent
agentRoutes.patch('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const agent = await updateAgent(agentId, userId, parsed.data);
    return c.json({ agent }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// DELETE /:id — delete agent
agentRoutes.delete('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');
  try {
    await deleteAgent(agentId, userId);
    return c.json({ ok: true }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// GET /:id/performance — get agent performance dashboard data
agentRoutes.get('/:id/performance', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');
  try {
    const performance = await getAgentPerformance(agentId, userId);
    return c.json({ performance }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// POST /:id/conversation — start/get conversation with agent
agentRoutes.post('/:id/conversation', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const agentId = c.req.param('id');
  try {
    const result = await startConversation(agentId, userId);
    const status = result.created ? 201 : 200;
    return c.json({ conversation: result.conversation }, status);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});
