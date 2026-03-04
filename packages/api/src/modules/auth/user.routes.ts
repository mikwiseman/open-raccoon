import { Hono } from 'hono';
import { authMiddleware } from './auth.middleware.js';
import { UpdateProfileSchema } from './auth.schema.js';
import { getUserById, getUserByUsername, updateProfile } from './auth.service.js';

export const userRoutes = new Hono();

userRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    const user = await getUserById(userId);
    return c.json({ user }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') {
      return c.json({ error: 'Not found', message: e.message }, 404);
    }
    throw err;
  }
});

userRoutes.patch('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }
  try {
    const user = await updateProfile(userId, parsed.data);
    return c.json({ user }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') {
      return c.json({ error: 'Not found', message: e.message }, 404);
    }
    throw err;
  }
});

userRoutes.get('/:username', async (c) => {
  const username = c.req.param('username');
  try {
    const user = await getUserByUsername(username);
    // Return public profile only (exclude email)
    const { email: _email, settings: _settings, ...publicUser } = user as Record<string, unknown>;
    void _email;
    void _settings;
    return c.json({ user: publicUser }, 200);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'NOT_FOUND') {
      return c.json({ error: 'Not found', message: e.message }, 404);
    }
    throw err;
  }
});
