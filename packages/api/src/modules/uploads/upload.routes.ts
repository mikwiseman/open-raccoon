import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../auth/auth.middleware.js';
import { getUploadUrl, getDownloadUrl } from '../../lib/s3.js';
import { randomUUID } from 'node:crypto';

export const uploadRoutes = new Hono();

const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(100),
});

uploadRoutes.post('/uploads/presign', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);
  const parsed = PresignSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 422);
  }

  const ext = parsed.data.filename.split('.').pop() || '';
  const key = `uploads/${userId}/${randomUUID()}${ext ? '.' + ext : ''}`;
  const url = await getUploadUrl(key, parsed.data.content_type);

  return c.json({ url, key }, 200);
});

uploadRoutes.get('/uploads/:key{.+}', authMiddleware, async (c) => {
  const key = c.req.param('key');
  const url = await getDownloadUrl(key);
  return c.json({ url }, 200);
});
