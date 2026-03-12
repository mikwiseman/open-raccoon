import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ApiClient, type SessionStoreAdapter } from '../client';
import { ApiError, parseApiError } from '../errors';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

describe('ApiClient — additional edge cases', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  /* ---- Construction ---- */

  it('constructs with default options', () => {
    const client = new ApiClient({ fetchImpl: fetchMock });
    expect(client).toBeInstanceOf(ApiClient);
  });

  it('uses provided baseUrl in request URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({ baseUrl: 'https://my-api.com/v1', fetchImpl: fetchMock });
    await client.request('/users');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://my-api.com/v1/users');
  });

  /* ---- GET requests ---- */

  it('sends GET request with auth header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ user: { id: '1' } }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
      getAccessToken: () => 'my-token-abc',
    });

    const result = await client.request<{ user: { id: string } }>('/users/me');

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer my-token-abc');
    expect(result.user.id).toBe('1');
  });

  it('sends GET request without auth header when no token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    await client.request('/public');

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.has('Authorization')).toBe(false);
  });

  /* ---- POST requests ---- */

  it('sends POST request with JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ created: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    await client.request('/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'Widget' }),
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test.com/items');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('sends PATCH request', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ updated: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    await client.request('/items/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('PATCH');
  });

  it('sends DELETE request without Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    await client.request('/items/1', { method: 'DELETE' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('DELETE');
    const headers = new Headers(init.headers);
    expect(headers.has('Content-Type')).toBe(false);
  });

  /* ---- Query parameters ---- */

  it('appends query parameters in the path', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    await client.request('/items?page=2&limit=10');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test.com/items?page=2&limit=10');
  });

  /* ---- 401 triggers token refresh ---- */

  it('retries request after successful 401 token refresh', async () => {
    const sessionStore: SessionStoreAdapter = {
      getRefreshToken: () => 'valid_refresh',
      setTokens: vi.fn(),
      clearSession: vi.fn(),
    };

    let requestCount = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        return jsonResponse({
          access_token: 'fresh_token',
          refresh_token: 'fresh_refresh',
        });
      }
      requestCount++;
      if (requestCount === 1) {
        return jsonResponse({ error: 'Token expired' }, 401);
      }
      return jsonResponse({ data: 'success' });
    });

    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
      getAccessToken: () => 'old_token',
      sessionStore,
    });

    const result = await client.request<{ data: string }>('/protected');

    expect(result.data).toBe('success');
    expect(sessionStore.setTokens).toHaveBeenCalledWith('fresh_token', 'fresh_refresh');
  });

  /* ---- 404 response throws ApiError ---- */

  it('throws ApiError with status 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    try {
      await client.request('/missing-resource');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
      expect((err as ApiError).message).toBe('Not found');
    }
  });

  /* ---- 500 response throws ApiError ---- */

  it('throws ApiError with status 500', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Internal server error' }, 500));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    try {
      await client.request('/broken');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(500);
    }
  });

  /* ---- Network error handling ---- */

  it('propagates network errors from fetch', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    await expect(client.request('/test')).rejects.toThrow('Failed to fetch');
  });

  /* ---- Content-type header setting ---- */

  it('sets Content-Type for POST with string body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    await client.request('/data', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
    });

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('does not override explicit Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    await client.request('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: 'a,b,c',
    });

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get('Content-Type')).toBe('text/csv');
  });

  it('does not set Content-Type for FormData', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    const form = new FormData();
    form.append('file', new Blob(['data']), 'file.txt');

    await client.request('/upload', { method: 'POST', body: form });

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.has('Content-Type')).toBe(false);
  });

  /* ---- Response parsing ---- */

  it('parses JSON response body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ users: [{ id: '1', name: 'Alice' }] }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    const result = await client.request<{ users: { id: string; name: string }[] }>('/users');
    expect(result.users).toHaveLength(1);
    expect(result.users[0].name).toBe('Alice');
  });

  it('returns text for non-JSON response', async () => {
    fetchMock.mockResolvedValue(textResponse('OK'));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    const result = await client.request('/health');
    expect(result).toBe('OK');
  });

  /* ---- Error response body extraction ---- */

  it('extracts error message from nested error object', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name too short',
            details: { field: 'name' },
          },
        },
        422,
      ),
    );
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    try {
      await client.request('/create');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Name too short');
      expect(apiErr.code).toBe('VALIDATION_ERROR');
    }
  });

  it('extracts error message from top-level message field', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Rate limit exceeded', code: 'RATE_LIMIT' }, 429),
    );
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    try {
      await client.request('/api');
      expect.fail('Should have thrown');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Rate limit exceeded');
      expect(apiErr.code).toBe('RATE_LIMIT');
      expect(apiErr.status).toBe(429);
    }
  });

  it('uses fallback message for non-record error payload', async () => {
    fetchMock.mockResolvedValue(textResponse('Bad Gateway', 502));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    try {
      await client.request('/api');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(502);
    }
  });

  /* ---- Custom headers alongside auth ---- */

  it('sends custom headers alongside auth', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
      getAccessToken: () => 'tok',
    });

    await client.request('/items', {
      headers: { 'Idempotency-Key': 'idem-uuid-123' },
    });

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get('Authorization')).toBe('Bearer tok');
    expect(headers.get('Idempotency-Key')).toBe('idem-uuid-123');
  });

  /* ---- Async getAccessToken ---- */

  it('supports async getAccessToken', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
      getAccessToken: async () => 'async-token-123',
    });

    await client.request('/test');

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get('Authorization')).toBe('Bearer async-token-123');
  });

  /* ---- Cache setting ---- */

  it('always sets cache to no-store', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });

    await client.request('/data');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.cache).toBe('no-store');
  });

  /* ---- isApiError static method ---- */

  it('isApiError returns true for ApiError', () => {
    const err = new ApiError('test', { status: 400 });
    expect(ApiClient.isApiError(err)).toBe(true);
  });

  it('isApiError returns false for regular Error', () => {
    expect(ApiClient.isApiError(new Error('nope'))).toBe(false);
  });

  it('isApiError returns false for null', () => {
    expect(ApiClient.isApiError(null)).toBe(false);
  });

  it('isApiError returns false for undefined', () => {
    expect(ApiClient.isApiError(undefined)).toBe(false);
  });
});

/* ================================================================ */
/*  parseApiError                                                    */
/* ================================================================ */

describe('parseApiError edge cases', () => {
  it('parses simple string error field', () => {
    const err = parseApiError(400, { error: 'Bad request' });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Bad request');
    expect(err.status).toBe(400);
  });

  it('parses nested error object', () => {
    const err = parseApiError(422, {
      error: { code: 'INVALID', message: 'Field invalid', details: { field: 'email' } },
    });
    expect(err.message).toBe('Field invalid');
    expect(err.code).toBe('INVALID');
    expect(err.details).toEqual({ field: 'email' });
  });

  it('uses fallback message for non-record payload', () => {
    const err = parseApiError(500, 'not an object');
    expect(err.message).toBe('Request failed with status 500');
    expect(err.status).toBe(500);
  });

  it('uses fallback message for empty object', () => {
    const err = parseApiError(503, {});
    expect(err.message).toBe('Request failed with status 503');
  });

  it('prefers message field over error field', () => {
    const err = parseApiError(400, { message: 'Primary message', error: 'Secondary' });
    expect(err.message).toBe('Primary message');
  });

  it('extracts code from top-level code field', () => {
    const err = parseApiError(409, {
      message: 'Conflict',
      code: 'DUPLICATE_ENTRY',
    });
    expect(err.code).toBe('DUPLICATE_ENTRY');
  });
});
