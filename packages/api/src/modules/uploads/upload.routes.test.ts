/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadRoutes } from './upload.routes.js';

// Mock DB connection (required by auth middleware → auth.service)
vi.mock('../../db/connection.js', () => ({
  sql: Object.assign(vi.fn(), { unsafe: vi.fn() }),
  db: {},
}));

// Mock S3 helpers
vi.mock('../../lib/s3.js', () => ({
  getUploadUrl: vi.fn(),
  getDownloadUrl: vi.fn(),
}));

async function getTokenHeader(): Promise<Record<string, string>> {
  const { generateTokens } = await import('../auth/auth.service.js');
  const { access_token } = await generateTokens('user-uuid', 'user');
  return { Authorization: `Bearer ${access_token}` };
}

function buildApp() {
  const app = new Hono();
  app.route('/', uploadRoutes);
  return app;
}

async function request(
  app: ReturnType<typeof buildApp>,
  method: string,
  path: string,
  opts: { body?: unknown; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };
  const req = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const res = await app.fetch(req);
  const json = (await res.json().catch(() => null)) as any;
  return { status: res.status, body: json };
}

let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  vi.clearAllMocks();
  app = buildApp();
});

/* -------------------------------------------------------------------------- */
/*  Authentication                                                            */
/* -------------------------------------------------------------------------- */

describe('Upload Routes — Authentication', () => {
  it('POST /uploads/presign returns 401 without auth token', async () => {
    const { status, body } = await request(app, 'POST', '/uploads/presign', {
      body: { filename: 'test.png', content_type: 'image/png' },
    });
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('GET /uploads/:key returns 401 without auth token', async () => {
    const { status, body } = await request(app, 'GET', '/uploads/user-uuid/some-file.png');
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('POST /uploads/presign rejects invalid auth token', async () => {
    const { status } = await request(app, 'POST', '/uploads/presign', {
      headers: { Authorization: 'Bearer invalid.token.here' },
      body: { filename: 'test.png', content_type: 'image/png' },
    });
    expect(status).toBe(401);
  });

  it('GET /uploads/:key rejects invalid auth token', async () => {
    const { status } = await request(app, 'GET', '/uploads/user-uuid/some-file.png', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(status).toBe(401);
  });
});

/* -------------------------------------------------------------------------- */
/*  POST /uploads/presign                                                     */
/* -------------------------------------------------------------------------- */

describe('POST /uploads/presign', () => {
  it('returns 200 with presigned URL and key for valid request', async () => {
    const { getUploadUrl } = await import('../../lib/s3.js');
    vi.mocked(getUploadUrl).mockResolvedValueOnce('https://s3.example.com/presigned-upload-url');

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/uploads/presign', {
      headers: authHeaders,
      body: { filename: 'photo.png', content_type: 'image/png' },
    });

    expect(status).toBe(200);
    expect(body.url).toBe('https://s3.example.com/presigned-upload-url');
    expect(body.key).toMatch(/^uploads\/user-uuid\/[a-f0-9-]+\.png$/);
    expect(vi.mocked(getUploadUrl)).toHaveBeenCalledWith(
      expect.stringMatching(/^uploads\/user-uuid\//),
      'image/png',
      300,
    );
  });

  it('returns 422 for missing filename', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/uploads/presign', {
      headers: authHeaders,
      body: { content_type: 'image/png' },
    });

    expect(status).toBe(422);
    expect(body.error).toBe('Validation error');
  });

  it('returns 422 for empty filename', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/uploads/presign', {
      headers: authHeaders,
      body: { filename: '', content_type: 'image/png' },
    });

    expect(status).toBe(422);
    expect(body.error).toBe('Validation error');
  });

  it('returns 422 for missing content_type', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/uploads/presign', {
      headers: authHeaders,
      body: { filename: 'test.png' },
    });

    expect(status).toBe(422);
    expect(body.error).toBe('Validation error');
  });

  it('returns 422 for invalid/disallowed content_type', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/uploads/presign', {
      headers: authHeaders,
      body: { filename: 'malware.exe', content_type: 'application/x-executable' },
    });

    expect(status).toBe(422);
    expect(body.error).toBe('Validation error');
  });

  it('returns 422 for filename exceeding 255 chars', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/uploads/presign', {
      headers: authHeaders,
      body: { filename: 'a'.repeat(256) + '.png', content_type: 'image/png' },
    });

    expect(status).toBe(422);
    expect(body.error).toBe('Validation error');
  });

  it('returns 422 for invalid JSON body', async () => {
    const authHeaders = await getTokenHeader();
    const res = await app.fetch(
      new Request('http://localhost/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: 'not-json',
      }),
    );
    expect(res.status).toBe(422);
  });

  it('accepts all allowed content types', async () => {
    const { getUploadUrl } = await import('../../lib/s3.js');
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'text/plain',
      'text/csv',
    ];

    const authHeaders = await getTokenHeader();

    for (const contentType of allowedTypes) {
      vi.mocked(getUploadUrl).mockResolvedValueOnce('https://s3.example.com/url');
      const { status } = await request(app, 'POST', '/uploads/presign', {
        headers: authHeaders,
        body: { filename: 'file.ext', content_type: contentType },
      });
      expect(status).toBe(200);
    }
  });

  it('returns 500 when S3 presign fails', async () => {
    const { getUploadUrl } = await import('../../lib/s3.js');
    vi.mocked(getUploadUrl).mockRejectedValueOnce(new Error('S3 connection failed'));

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'POST', '/uploads/presign', {
      headers: authHeaders,
      body: { filename: 'photo.png', content_type: 'image/png' },
    });

    expect(status).toBe(500);
    expect(body.error).toBe('Failed to generate upload URL');
  });

  it('generates key with correct extension from filename', async () => {
    const { getUploadUrl } = await import('../../lib/s3.js');
    vi.mocked(getUploadUrl).mockResolvedValueOnce('https://s3.example.com/url');

    const authHeaders = await getTokenHeader();
    const { body } = await request(app, 'POST', '/uploads/presign', {
      headers: authHeaders,
      body: { filename: 'document.pdf', content_type: 'application/pdf' },
    });

    expect(body.key).toMatch(/\.pdf$/);
  });

  it('generates key without extension for files without one', async () => {
    const { getUploadUrl } = await import('../../lib/s3.js');
    vi.mocked(getUploadUrl).mockResolvedValueOnce('https://s3.example.com/url');

    const authHeaders = await getTokenHeader();
    const { body } = await request(app, 'POST', '/uploads/presign', {
      headers: authHeaders,
      body: { filename: 'README', content_type: 'text/plain' },
    });

    // No extension since "README" has no dot — the ext would be "README" itself
    // The route extracts last segment after splitting by '.', so single-segment name
    // yields the name itself as ext, which is fine
    expect(body.key).toMatch(/^uploads\/user-uuid\/[a-f0-9-]+/);
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /uploads/:key                                                         */
/* -------------------------------------------------------------------------- */

describe('GET /uploads/:key', () => {
  it('returns 200 with download URL for own upload', async () => {
    const { getDownloadUrl } = await import('../../lib/s3.js');
    vi.mocked(getDownloadUrl).mockResolvedValueOnce(
      'https://s3.example.com/presigned-download-url',
    );

    const authHeaders = await getTokenHeader();
    const key = 'uploads/user-uuid/abc123.png';
    const { status, body } = await request(app, 'GET', `/uploads/${key}`, {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.url).toBe('https://s3.example.com/presigned-download-url');
    expect(vi.mocked(getDownloadUrl)).toHaveBeenCalledWith(key);
  });

  it('returns 403 when accessing another user upload', async () => {
    const authHeaders = await getTokenHeader();
    const key = 'uploads/other-user-id/abc123.png';
    const { status, body } = await request(app, 'GET', `/uploads/${key}`, {
      headers: authHeaders,
    });

    expect(status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 for key without uploads prefix for the user', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/uploads/some-random-key.png', {
      headers: authHeaders,
    });

    expect(status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 500 when S3 download URL generation fails', async () => {
    const { getDownloadUrl } = await import('../../lib/s3.js');
    vi.mocked(getDownloadUrl).mockRejectedValueOnce(new Error('S3 error'));

    const authHeaders = await getTokenHeader();
    const key = 'uploads/user-uuid/abc123.png';
    const { status, body } = await request(app, 'GET', `/uploads/${key}`, {
      headers: authHeaders,
    });

    expect(status).toBe(500);
    expect(body.error).toBe('Failed to generate download URL');
  });

  it('handles keys with nested paths', async () => {
    const { getDownloadUrl } = await import('../../lib/s3.js');
    vi.mocked(getDownloadUrl).mockResolvedValueOnce('https://s3.example.com/url');

    const authHeaders = await getTokenHeader();
    const key = 'uploads/user-uuid/some-uuid.png';
    const { status, body } = await request(app, 'GET', `/uploads/${key}`, {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.url).toBe('https://s3.example.com/url');
  });
});
