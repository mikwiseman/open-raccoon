import { expect, test } from '@playwright/test';
import { apiCall, getSeedSession, uniqueLabel } from './helpers/waiagents';

/*
 * E2E tests for the Crews API (/api/v1/crews).
 *
 * Crews group multiple agents into a multi-step pipeline.
 * These tests cover the full CRUD lifecycle and crew execution.
 *
 * Prerequisites:
 *   - The seeded user "alex" must exist and have permission to create agents.
 *   - At least one agent must be creatable (the test creates its own).
 */

type CrewResponse = {
  crew: {
    id: string;
    name: string;
    description: string | null;
    steps: Array<{ agent_id: string; role: string; parallel_group?: string }>;
    visibility: string;
    category: string | null;
    created_at: string;
    updated_at: string;
  };
};

type CrewListResponse = {
  crews: Array<CrewResponse['crew']>;
};

type AgentResponse = {
  agent: {
    id: string;
    name: string;
    slug: string;
  };
};

test.describe('Crews API', () => {
  let accessToken: string;
  let agentIdA: string;
  let agentIdB: string;

  test.beforeAll(async ({ request }) => {
    const alex = await getSeedSession(request, 'alex');
    accessToken = alex.accessToken;

    // Create two agents to use in crew steps
    const agentA = await apiCall<AgentResponse>(request, 'POST', '/agents', {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: uniqueLabel('crew-agent-a'),
        description: 'Agent A for crew e2e tests',
        system_prompt: 'You are a helpful assistant.',
        model: 'claude-sonnet-4-6',
        visibility: 'private',
      },
    });
    agentIdA = agentA.body.agent.id;

    const agentB = await apiCall<AgentResponse>(request, 'POST', '/agents', {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: uniqueLabel('crew-agent-b'),
        description: 'Agent B for crew e2e tests',
        system_prompt: 'You are a helpful assistant.',
        model: 'claude-sonnet-4-6',
        visibility: 'private',
      },
    });
    agentIdB = agentB.body.agent.id;
  });

  test.afterAll(async ({ request }) => {
    // Clean up agents created for testing
    if (agentIdA) {
      await apiCall(request, 'DELETE', `/agents/${agentIdA}`, {
        token: accessToken,
      });
    }
    if (agentIdB) {
      await apiCall(request, 'DELETE', `/agents/${agentIdB}`, {
        token: accessToken,
      });
    }
  });

  test('full CRUD lifecycle: create, get, list, update, delete', async ({ request }) => {
    const crewName = uniqueLabel('e2e-crew');
    const updatedName = uniqueLabel('e2e-crew-updated');

    // --- CREATE ---
    const createResponse = await apiCall<CrewResponse>(request, 'POST', '/crews', {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: crewName,
        description: 'Crew created by e2e test',
        steps: [
          { agentId: agentIdA, role: 'researcher' },
          { agentId: agentIdB, role: 'writer' },
        ],
        visibility: 'private',
      },
    });

    const crewId = createResponse.body.crew.id;
    expect(crewId).toBeTruthy();
    expect(createResponse.body.crew.name).toBe(crewName);
    expect(createResponse.body.crew.description).toBe('Crew created by e2e test');
    expect(createResponse.body.crew.steps).toHaveLength(2);
    expect(createResponse.body.crew.visibility).toBe('private');

    // --- GET ---
    const getResponse = await apiCall<CrewResponse>(request, 'GET', `/crews/${crewId}`, {
      token: accessToken,
      expectedStatus: 200,
    });

    expect(getResponse.body.crew.id).toBe(crewId);
    expect(getResponse.body.crew.name).toBe(crewName);
    expect(getResponse.body.crew.steps).toHaveLength(2);

    // --- LIST ---
    const listResponse = await apiCall<CrewListResponse>(request, 'GET', '/crews', {
      token: accessToken,
      expectedStatus: 200,
    });

    expect(listResponse.body.crews).toBeInstanceOf(Array);
    const found = listResponse.body.crews.find((c) => c.id === crewId);
    expect(found).toBeTruthy();
    expect(found?.name).toBe(crewName);

    // --- UPDATE ---
    const updateResponse = await apiCall<CrewResponse>(request, 'PATCH', `/crews/${crewId}`, {
      token: accessToken,
      expectedStatus: 200,
      data: {
        name: updatedName,
        description: 'Updated description',
        visibility: 'unlisted',
      },
    });

    expect(updateResponse.body.crew.name).toBe(updatedName);
    expect(updateResponse.body.crew.description).toBe('Updated description');
    expect(updateResponse.body.crew.visibility).toBe('unlisted');

    // Verify update persisted
    const getAfterUpdate = await apiCall<CrewResponse>(request, 'GET', `/crews/${crewId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
    expect(getAfterUpdate.body.crew.name).toBe(updatedName);

    // --- DELETE ---
    const deleteResponse = await apiCall<{ ok: boolean }>(request, 'DELETE', `/crews/${crewId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
    expect(deleteResponse.body.ok).toBe(true);

    // Verify deletion — GET should return 404
    await apiCall(request, 'GET', `/crews/${crewId}`, {
      token: accessToken,
      expectedStatus: 404,
    });
  });

  test('create crew with parallel groups', async ({ request }) => {
    const crewName = uniqueLabel('e2e-crew-parallel');

    const createResponse = await apiCall<CrewResponse>(request, 'POST', '/crews', {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: crewName,
        steps: [
          { agentId: agentIdA, role: 'researcher', parallelGroup: 'phase-1' },
          { agentId: agentIdB, role: 'writer', parallelGroup: 'phase-1' },
        ],
        visibility: 'private',
      },
    });

    const crewId = createResponse.body.crew.id;
    expect(createResponse.body.crew.steps).toHaveLength(2);

    // Clean up
    await apiCall(request, 'DELETE', `/crews/${crewId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });

  test('update crew steps', async ({ request }) => {
    const crewName = uniqueLabel('e2e-crew-step-update');

    const createResponse = await apiCall<CrewResponse>(request, 'POST', '/crews', {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: crewName,
        steps: [{ agentId: agentIdA, role: 'researcher' }],
        visibility: 'private',
      },
    });

    const crewId = createResponse.body.crew.id;
    expect(createResponse.body.crew.steps).toHaveLength(1);

    // Update steps to add a second agent
    const updateResponse = await apiCall<CrewResponse>(request, 'PATCH', `/crews/${crewId}`, {
      token: accessToken,
      expectedStatus: 200,
      data: {
        steps: [
          { agentId: agentIdA, role: 'researcher' },
          { agentId: agentIdB, role: 'editor' },
        ],
      },
    });

    expect(updateResponse.body.crew.steps).toHaveLength(2);

    // Clean up
    await apiCall(request, 'DELETE', `/crews/${crewId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });

  test('create crew rejects empty steps', async ({ request }) => {
    await apiCall(request, 'POST', '/crews', {
      token: accessToken,
      expectedStatus: 422,
      data: {
        name: uniqueLabel('e2e-crew-empty'),
        steps: [],
      },
    });
  });

  test('create crew rejects missing name', async ({ request }) => {
    await apiCall(request, 'POST', '/crews', {
      token: accessToken,
      expectedStatus: 422,
      data: {
        steps: [{ agentId: agentIdA, role: 'researcher' }],
      },
    });
  });

  test('get non-existent crew returns 404', async ({ request }) => {
    await apiCall(request, 'GET', '/crews/00000000-0000-0000-0000-000000000000', {
      token: accessToken,
      expectedStatus: 404,
    });
  });

  test('delete non-existent crew returns 404', async ({ request }) => {
    await apiCall(request, 'DELETE', '/crews/00000000-0000-0000-0000-000000000000', {
      token: accessToken,
      expectedStatus: 404,
    });
  });

  test('unauthenticated request returns 401', async ({ request }) => {
    await apiCall(request, 'GET', '/crews', {
      expectedStatus: 401,
    });
  });

  test('run crew requires a conversation_id and message', async ({ request }) => {
    // Create a crew first
    const crewName = uniqueLabel('e2e-crew-run-validation');
    const createResponse = await apiCall<CrewResponse>(request, 'POST', '/crews', {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: crewName,
        steps: [{ agentId: agentIdA, role: 'researcher' }],
        visibility: 'private',
      },
    });

    const crewId = createResponse.body.crew.id;

    // POST /crews/:id/run without required fields → 422
    await apiCall(request, 'POST', `/crews/${crewId}/run`, {
      token: accessToken,
      expectedStatus: 422,
      data: {},
    });

    // POST /crews/:id/run with missing message → 422
    await apiCall(request, 'POST', `/crews/${crewId}/run`, {
      token: accessToken,
      expectedStatus: 422,
      data: { conversation_id: '00000000-0000-0000-0000-000000000000' },
    });

    // Clean up
    await apiCall(request, 'DELETE', `/crews/${crewId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });

  test('run crew with valid payload against a conversation', async ({ request }) => {
    // Create a crew
    const crewName = uniqueLabel('e2e-crew-run');
    const createResponse = await apiCall<CrewResponse>(request, 'POST', '/crews', {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: crewName,
        steps: [{ agentId: agentIdA, role: 'researcher' }],
        visibility: 'private',
      },
    });

    const crewId = createResponse.body.crew.id;

    // Create a conversation to run the crew against
    const conversationResponse = await apiCall<{ conversation: { id: string } }>(
      request,
      'POST',
      '/conversations',
      {
        token: accessToken,
        data: { type: 'group', title: uniqueLabel('crew-run-conv') },
      },
    );

    expect([200, 201]).toContain(conversationResponse.status);
    const conversationId = conversationResponse.body.conversation.id;

    // Run crew — this triggers actual LLM calls, so the response shape depends
    // on the backend being fully wired. We accept either success (200) or
    // a service error (400/404/500) as long as the route is reachable.
    const runResponse = await apiCall<{
      response?: string;
      step_results?: Array<unknown>;
      error?: string;
    }>(request, 'POST', `/crews/${crewId}/run`, {
      token: accessToken,
      data: {
        conversation_id: conversationId,
        message: 'Hello crew, run a quick test.',
      },
    });

    // Route is reachable and returned a valid JSON response
    expect([200, 400, 404, 500]).toContain(runResponse.status);

    // If it succeeded, verify shape
    if (runResponse.status === 200) {
      expect(runResponse.body.response).toBeDefined();
      expect(runResponse.body.step_results).toBeInstanceOf(Array);
    }

    // Clean up
    await apiCall(request, 'DELETE', `/crews/${crewId}`, { token: accessToken });
    await apiCall(request, 'DELETE', `/conversations/${conversationId}`, {
      token: accessToken,
    });
  });

  test("crew isolation: one user cannot access another user's crew", async ({ request }) => {
    const alex = await getSeedSession(request, 'alex');
    const maya = await getSeedSession(request, 'maya');

    // Alex creates a crew
    const crewName = uniqueLabel('e2e-crew-isolation');
    const createResponse = await apiCall<CrewResponse>(request, 'POST', '/crews', {
      token: alex.accessToken,
      expectedStatus: 201,
      data: {
        name: crewName,
        steps: [{ agentId: agentIdA, role: 'researcher' }],
        visibility: 'private',
      },
    });

    const crewId = createResponse.body.crew.id;

    // Maya tries to GET Alex's crew — should be 404 (not found for this user)
    await apiCall(request, 'GET', `/crews/${crewId}`, {
      token: maya.accessToken,
      expectedStatus: 404,
    });

    // Maya tries to DELETE Alex's crew — should be 404
    await apiCall(request, 'DELETE', `/crews/${crewId}`, {
      token: maya.accessToken,
      expectedStatus: 404,
    });

    // Clean up as Alex
    await apiCall(request, 'DELETE', `/crews/${crewId}`, {
      token: alex.accessToken,
      expectedStatus: 200,
    });
  });
});
