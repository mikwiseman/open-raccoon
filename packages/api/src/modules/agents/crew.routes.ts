import { Hono } from 'hono';
import { authMiddleware } from '../auth/auth.middleware.js';
import { runCrew } from './crew.js';
import { CreateCrewSchema, RunCrewSchema, UpdateCrewSchema } from './crew.schema.js';
import { createCrew, deleteCrew, getCrew, listCrews, updateCrew } from './crew.service.js';

export const crewRoutes = new Hono();

// GET / — list user's crews
crewRoutes.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const crews = await listCrews(userId);
  return c.json({ crews }, 200);
});

// POST / — create crew
crewRoutes.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = CreateCrewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const crew = await createCrew(userId, parsed.data);
    return c.json({ crew }, 201);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});

// GET /:id — get crew details
crewRoutes.get('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const crewId = c.req.param('id');
  try {
    const crew = await getCrew(crewId, userId);
    return c.json({ crew }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// PATCH /:id — update crew
crewRoutes.patch('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const crewId = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateCrewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const crew = await updateCrew(crewId, userId, parsed.data);
    return c.json({ crew }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});

// DELETE /:id — delete crew
crewRoutes.delete('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const crewId = c.req.param('id');
  try {
    await deleteCrew(crewId, userId);
    return c.json({ ok: true }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    throw err;
  }
});

// POST /:id/run — execute crew in a conversation
crewRoutes.post('/:id/run', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const crewId = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = RunCrewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const result = await runCrew({
      crewId,
      conversationId: parsed.data.conversation_id,
      userId,
      message: parsed.data.message,
    });
    return c.json({ response: result.response, step_results: result.stepResults }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') return c.json({ error: 'Not found', message: e.message }, 404);
    if (e.code === 'BAD_REQUEST') return c.json({ error: 'Bad request', message: e.message }, 400);
    throw err;
  }
});
