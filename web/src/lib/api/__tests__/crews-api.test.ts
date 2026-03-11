import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ApiClient } from '../client';
import { WaiAgentsApi } from '../services';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('WaiAgentsApi — crew methods', () => {
  let fetchMock: Mock;
  let api: WaiAgentsApi;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = new ApiClient({
      baseUrl: 'https://api.test.com',
      fetchImpl: fetchMock,
    });
    api = new WaiAgentsApi(client);
  });

  describe('listCrews', () => {
    it('sends GET /crews', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          crews: [{ id: 'cr_1', name: 'Crew A' }],
          page_info: { next_cursor: null, has_more: false },
        }),
      );

      const result = await api.listCrews();

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test.com/crews');
      expect(init.method).toBeUndefined(); // GET is the default
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('cr_1');
    });

    it('passes cursor and limit as query params', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ crews: [], page_info: { next_cursor: null, has_more: false } }),
      );

      await api.listCrews({ cursor: 'page2', limit: 10 });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('cursor=page2');
      expect(url).toContain('limit=10');
    });

    it('normalizes page_info from response', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          crews: [{ id: 'cr_1' }],
          page_info: { next_cursor: 'abc', has_more: true },
        }),
      );

      const result = await api.listCrews();

      expect(result.page_info.next_cursor).toBe('abc');
      expect(result.page_info.has_more).toBe(true);
    });

    it('returns empty items when payload has no crews key', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ something_else: [1, 2] }));

      const result = await api.listCrews();

      expect(result.items).toEqual([]);
    });
  });

  describe('createCrew', () => {
    it('sends POST /crews with correct payload', async () => {
      const crewData = {
        name: 'Research Crew',
        description: 'A research crew',
        agents: [{ agent_id: 'a_1', role: 'researcher', goal: 'Find data' }],
        process: 'sequential' as const,
      };
      fetchMock.mockResolvedValue(jsonResponse({ crew: { id: 'cr_new', ...crewData } }));

      const result = await api.createCrew(crewData);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test.com/crews');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body.name).toBe('Research Crew');
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0].agent_id).toBe('a_1');
      expect(body.process).toBe('sequential');
      expect(result.crew.id).toBe('cr_new');
    });

    it('sends minimal payload when optional fields are omitted', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ crew: { id: 'cr_min' } }));

      await api.createCrew({
        name: 'Minimal',
        agents: [],
      });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.name).toBe('Minimal');
      expect(body.agents).toEqual([]);
      expect(body.description).toBeUndefined();
      expect(body.process).toBeUndefined();
    });
  });

  describe('getCrew', () => {
    it('sends GET /crews/:id', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ crew: { id: 'cr_1', name: 'My Crew' } }));

      const result = await api.getCrew('cr_1');

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test.com/crews/cr_1');
      expect(result.crew.name).toBe('My Crew');
    });
  });

  describe('updateCrew', () => {
    it('sends PATCH /crews/:id with partial payload', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ crew: { id: 'cr_1', name: 'Updated' } }));

      await api.updateCrew('cr_1', { name: 'Updated', process: 'parallel' });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test.com/crews/cr_1');
      expect(init.method).toBe('PATCH');
      const body = JSON.parse(init.body);
      expect(body.name).toBe('Updated');
      expect(body.process).toBe('parallel');
    });

    it('sends only changed fields', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ crew: { id: 'cr_1' } }));

      await api.updateCrew('cr_1', { description: 'new desc' });

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.description).toBe('new desc');
      expect(body.name).toBeUndefined();
    });
  });

  describe('deleteCrew', () => {
    it('sends DELETE /crews/:id', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 200));

      await api.deleteCrew('cr_1');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test.com/crews/cr_1');
      expect(init.method).toBe('DELETE');
    });
  });

  describe('runCrew', () => {
    it('sends POST /crews/:id/run with input', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ run_id: 'run_1', status: 'started' }));

      const result = await api.runCrew('cr_1', { query: 'test input' });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.test.com/crews/cr_1/run');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body.query).toBe('test input');
      expect(result.run_id).toBe('run_1');
      expect(result.status).toBe('started');
    });

    it('sends empty body when no input provided', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ run_id: 'run_2', status: 'started' }));

      await api.runCrew('cr_1');

      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body).toEqual({});
    });

    it('includes an Idempotency-Key header', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ run_id: 'run_3', status: 'started' }));

      await api.runCrew('cr_1');

      const [, init] = fetchMock.mock.calls[0];
      const headers = new Headers(init.headers);
      expect(headers.get('Idempotency-Key')).toBeTruthy();
    });
  });
});
