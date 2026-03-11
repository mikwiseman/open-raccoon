import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from './auth.service.js';

export const authMiddleware = createMiddleware<{
  Variables: {
    userId: string;
    userRole: string;
  };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { error: 'Unauthorized', message: 'Missing or invalid Authorization header' },
      401,
    );
  }

  const token = authHeader.slice(7);

  try {
    const { sub, role } = await verifyAccessToken(token);
    c.set('userId', sub);
    c.set('userRole', role);
    return next();
  } catch {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
  }
});
