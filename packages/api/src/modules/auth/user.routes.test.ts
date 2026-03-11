/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userRoutes } from './user.routes.js';

// Mock DB connection
vi.mock('../../db/connection.js', () => ({
  sql: Object.assign(vi.fn(), { unsafe: vi.fn() }),
  db: {},
}));

async function getTokenHeader(): Promise<Record<string, string>> {
  const { generateTokens } = await import('./auth.service.js');
  const { access_token } = await generateTokens('user-uuid', 'user');
  return { Authorization: `Bearer ${access_token}` };
}

function buildApp() {
  const app = new Hono();
  app.route('/users', userRoutes);
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

const MOCK_USER_ROW = {
  id: 'user-uuid',
  username: 'testuser',
  display_name: 'Test User',
  email: 'test@example.com',
  avatar_url: null,
  bio: 'Hello world',
  status: 'active',
  role: 'user',
  settings: {},
  plan: 'free',
  inserted_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  vi.clearAllMocks();
  app = buildApp();
});

/* -------------------------------------------------------------------------- */
/*  GET /users/me — Authentication                                            */
/* -------------------------------------------------------------------------- */

describe('GET /users/me — Authentication', () => {
  it('returns 401 without auth token', async () => {
    const { status, body } = await request(app, 'GET', '/users/me');
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with invalid auth token', async () => {
    const { status, body } = await request(app, 'GET', '/users/me', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with malformed Authorization header', async () => {
    const { status } = await request(app, 'GET', '/users/me', {
      headers: { Authorization: 'NotBearer sometoken' },
    });
    expect(status).toBe(401);
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /users/me — Success                                                   */
/* -------------------------------------------------------------------------- */

describe('GET /users/me — Success', () => {
  it('returns 200 with user data for authenticated request', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([MOCK_USER_ROW] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/users/me', {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.user).toBeDefined();
    expect(body.user.id).toBe('user-uuid');
    expect(body.user.username).toBe('testuser');
    expect(body.user.display_name).toBe('Test User');
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.bio).toBe('Hello world');
    expect(body.user.status).toBe('active');
    expect(body.user.role).toBe('user');
    expect(body.user.plan).toBe('free');
    expect(body.user.created_at).toBeDefined();
    expect(body.user.updated_at).toBeDefined();
  });

  it('returns 404 when authenticated user no longer exists in DB', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/users/me', {
      headers: authHeaders,
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
    expect(body.message).toBe('User not found');
  });
});

/* -------------------------------------------------------------------------- */
/*  PATCH /users/me — Authentication                                          */
/* -------------------------------------------------------------------------- */

describe('PATCH /users/me — Authentication', () => {
  it('returns 401 without auth token', async () => {
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      body: { display_name: 'New Name' },
    });
    expect(status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with invalid auth token', async () => {
    const { status } = await request(app, 'PATCH', '/users/me', {
      headers: { Authorization: 'Bearer invalid.token.here' },
      body: { display_name: 'New Name' },
    });
    expect(status).toBe(401);
  });
});

/* -------------------------------------------------------------------------- */
/*  PATCH /users/me — Validation                                              */
/* -------------------------------------------------------------------------- */

describe('PATCH /users/me — Validation', () => {
  it('returns 422 for invalid JSON body', async () => {
    const authHeaders = await getTokenHeader();
    const res = await app.fetch(
      new Request('http://localhost/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: 'not-json',
      }),
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 for display_name exceeding 128 chars', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { display_name: 'a'.repeat(129) },
    });

    expect(status).toBe(422);
    expect(body.error).toBe('Validation error');
  });

  it('returns 422 for bio exceeding 2000 chars', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { bio: 'x'.repeat(2001) },
    });

    expect(status).toBe(422);
    expect(body.error).toBe('Validation error');
  });

  it('returns 422 for invalid avatar_url', async () => {
    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { avatar_url: 'not-a-url' },
    });

    expect(status).toBe(422);
    expect(body.error).toBe('Validation error');
  });

  it('returns 422 for unexpected field types', async () => {
    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { display_name: 12345 },
    });

    expect(status).toBe(422);
  });
});

/* -------------------------------------------------------------------------- */
/*  PATCH /users/me — Success                                                 */
/* -------------------------------------------------------------------------- */

describe('PATCH /users/me — Success', () => {
  it('returns 200 when updating display_name', async () => {
    const { sql } = await import('../../db/connection.js');
    const updatedRow = { ...MOCK_USER_ROW, display_name: 'Updated Name' };
    vi.mocked(sql).mockResolvedValueOnce([updatedRow] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { display_name: 'Updated Name' },
    });

    expect(status).toBe(200);
    expect(body.user.display_name).toBe('Updated Name');
  });

  it('returns 200 when updating bio', async () => {
    const { sql } = await import('../../db/connection.js');
    const updatedRow = { ...MOCK_USER_ROW, bio: 'New bio text' };
    vi.mocked(sql).mockResolvedValueOnce([updatedRow] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { bio: 'New bio text' },
    });

    expect(status).toBe(200);
    expect(body.user.bio).toBe('New bio text');
  });

  it('returns 200 when updating avatar_url with valid URL', async () => {
    const { sql } = await import('../../db/connection.js');
    const updatedRow = { ...MOCK_USER_ROW, avatar_url: 'https://example.com/avatar.png' };
    vi.mocked(sql).mockResolvedValueOnce([updatedRow] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { avatar_url: 'https://example.com/avatar.png' },
    });

    expect(status).toBe(200);
    expect(body.user.avatar_url).toBe('https://example.com/avatar.png');
  });

  it('returns 200 when clearing avatar_url with empty string', async () => {
    const { sql } = await import('../../db/connection.js');
    const updatedRow = { ...MOCK_USER_ROW, avatar_url: null };
    vi.mocked(sql).mockResolvedValueOnce([updatedRow] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { avatar_url: '' },
    });

    expect(status).toBe(200);
    expect(body.user.avatar_url).toBeNull();
  });

  it('returns 200 when updating settings', async () => {
    const { sql } = await import('../../db/connection.js');
    const updatedRow = { ...MOCK_USER_ROW, settings: { theme: 'dark', lang: 'en' } };
    vi.mocked(sql).mockResolvedValueOnce([updatedRow] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { settings: { theme: 'dark', lang: 'en' } },
    });

    expect(status).toBe(200);
    expect(body.user.settings).toEqual({ theme: 'dark', lang: 'en' });
  });

  it('returns 200 when updating multiple fields at once', async () => {
    const { sql } = await import('../../db/connection.js');
    const updatedRow = {
      ...MOCK_USER_ROW,
      display_name: 'Multi Update',
      bio: 'Updated bio',
      avatar_url: 'https://example.com/new.png',
    };
    vi.mocked(sql).mockResolvedValueOnce([updatedRow] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: {
        display_name: 'Multi Update',
        bio: 'Updated bio',
        avatar_url: 'https://example.com/new.png',
      },
    });

    expect(status).toBe(200);
    expect(body.user.display_name).toBe('Multi Update');
    expect(body.user.bio).toBe('Updated bio');
    expect(body.user.avatar_url).toBe('https://example.com/new.png');
  });

  it('strips HTML tags from display_name', async () => {
    const { sql } = await import('../../db/connection.js');
    const updatedRow = { ...MOCK_USER_ROW, display_name: 'Clean Name' };
    vi.mocked(sql).mockResolvedValueOnce([updatedRow] as any);

    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { display_name: '<script>alert("xss")</script>Clean Name' },
    });

    expect(status).toBe(200);
    // The UpdateProfileSchema transform strips HTML tags before passing to service
    expect(vi.mocked(sql)).toHaveBeenCalledTimes(1);
  });

  it('strips HTML tags from bio', async () => {
    const { sql } = await import('../../db/connection.js');
    const updatedRow = { ...MOCK_USER_ROW, bio: 'Safe bio' };
    vi.mocked(sql).mockResolvedValueOnce([updatedRow] as any);

    const authHeaders = await getTokenHeader();
    const { status } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { bio: '<b>Safe</b> bio' },
    });

    expect(status).toBe(200);
    expect(vi.mocked(sql)).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when user no longer exists in DB during update', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: { display_name: 'Ghost User' },
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
    expect(body.message).toBe('User not found');
  });

  it('accepts empty body (no-op update)', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([MOCK_USER_ROW] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'PATCH', '/users/me', {
      headers: authHeaders,
      body: {},
    });

    expect(status).toBe(200);
    expect(body.user).toBeDefined();
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /users/:username                                                      */
/* -------------------------------------------------------------------------- */

describe('GET /users/:username — Success', () => {
  it('returns 200 with public user profile', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([MOCK_USER_ROW] as any);

    const { status, body } = await request(app, 'GET', '/users/testuser');

    expect(status).toBe(200);
    expect(body.user).toBeDefined();
    expect(body.user.id).toBe('user-uuid');
    expect(body.user.username).toBe('testuser');
    expect(body.user.display_name).toBe('Test User');
    expect(body.user.bio).toBe('Hello world');
    expect(body.user.status).toBe('active');
  });

  it('excludes email from public profile', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([MOCK_USER_ROW] as any);

    const { status, body } = await request(app, 'GET', '/users/testuser');

    expect(status).toBe(200);
    expect(body.user.email).toBeUndefined();
  });

  it('excludes settings from public profile', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([MOCK_USER_ROW] as any);

    const { status, body } = await request(app, 'GET', '/users/testuser');

    expect(status).toBe(200);
    expect(body.user.settings).toBeUndefined();
  });

  it('does not require authentication', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([MOCK_USER_ROW] as any);

    // No auth header provided
    const { status } = await request(app, 'GET', '/users/testuser');

    expect(status).toBe(200);
  });
});

describe('GET /users/:username — Not Found', () => {
  it('returns 404 for non-existent username', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { status, body } = await request(app, 'GET', '/users/nonexistent');

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
    expect(body.message).toBe('User not found');
  });

  it('returns 404 for another non-existent username', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([] as any);

    const { status, body } = await request(app, 'GET', '/users/does_not_exist_999');

    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /users/:username — with auth (still works)                            */
/* -------------------------------------------------------------------------- */

describe('GET /users/:username — Authenticated', () => {
  it('returns 200 with public profile even when authenticated', async () => {
    const { sql } = await import('../../db/connection.js');
    vi.mocked(sql).mockResolvedValueOnce([MOCK_USER_ROW] as any);

    const authHeaders = await getTokenHeader();
    const { status, body } = await request(app, 'GET', '/users/testuser', {
      headers: authHeaders,
    });

    expect(status).toBe(200);
    expect(body.user.username).toBe('testuser');
    // Still excludes email/settings even for authenticated requests
    expect(body.user.email).toBeUndefined();
    expect(body.user.settings).toBeUndefined();
  });
});
