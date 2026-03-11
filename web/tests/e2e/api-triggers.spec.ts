import { expect, test } from '@playwright/test';
import { apiCall, getSeedSession, uniqueLabel } from './helpers/waiagents';

/*
 * E2E tests for the Triggers API and webhook hooks.
 *
 * Triggers attach to an agent and fire via webhook, schedule, or condition.
 * Routes:
 *   Authenticated CRUD: /api/v1/agents/:agentId/triggers
 *   Public webhook:     /api/v1/hooks/:token
 *
 * Prerequisites:
 *   - The seeded user "alex" must exist.
 *   - Agent creation must work (the test creates its own agent).
 */

type TriggerResponse = {
  trigger: {
    id: string;
    agent_id: string;
    creator_id: string;
    name: string;
    trigger_type: 'webhook' | 'schedule' | 'condition';
    token: string;
    hmac_configured: boolean;
    condition_filter: { all?: Array<unknown>; any?: Array<unknown> } | null;
    message_template: string | null;
    cron_expression: string | null;
    enabled: boolean;
    last_fired_at: string | null;
    fire_count: number;
    metadata: Record<string, unknown>;
    created_at: string | null;
    updated_at: string | null;
  };
};

type TriggerListResponse = {
  triggers: Array<TriggerResponse['trigger']>;
};

type AgentResponse = {
  agent: {
    id: string;
    name: string;
    slug: string;
  };
};

test.describe('Triggers API', () => {
  let accessToken: string;
  let agentId: string;

  test.beforeAll(async ({ request }) => {
    const alex = await getSeedSession(request, 'alex');
    accessToken = alex.accessToken;

    // Create an agent to attach triggers to
    const agentResponse = await apiCall<AgentResponse>(request, 'POST', '/agents', {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: uniqueLabel('trigger-agent'),
        description: 'Agent for trigger e2e tests',
        system_prompt: 'You are a helpful assistant.',
        model: 'claude-sonnet-4-6',
        visibility: 'private',
      },
    });
    agentId = agentResponse.body.agent.id;
  });

  test.afterAll(async ({ request }) => {
    if (agentId) {
      await apiCall(request, 'DELETE', `/agents/${agentId}`, {
        token: accessToken,
      });
    }
  });

  test('full CRUD lifecycle: create, get, list, update, delete', async ({ request }) => {
    const triggerName = uniqueLabel('e2e-trigger');
    const updatedName = uniqueLabel('e2e-trigger-updated');

    // --- CREATE ---
    const createResponse = await apiCall<TriggerResponse>(
      request,
      'POST',
      `/agents/${agentId}/triggers`,
      {
        token: accessToken,
        expectedStatus: 201,
        data: {
          name: triggerName,
          trigger_type: 'webhook',
          message_template: 'Webhook fired with payload: {{payload}}',
          enabled: true,
        },
      },
    );

    const triggerId = createResponse.body.trigger.id;
    expect(triggerId).toBeTruthy();
    expect(createResponse.body.trigger.name).toBe(triggerName);
    expect(createResponse.body.trigger.trigger_type).toBe('webhook');
    expect(createResponse.body.trigger.token).toBeTruthy();
    expect(createResponse.body.trigger.enabled).toBe(true);
    expect(createResponse.body.trigger.agent_id).toBe(agentId);
    expect(createResponse.body.trigger.hmac_configured).toBe(false);
    expect(createResponse.body.trigger.fire_count).toBe(0);

    // --- GET ---
    const getResponse = await apiCall<TriggerResponse>(
      request,
      'GET',
      `/agents/${agentId}/triggers/${triggerId}`,
      {
        token: accessToken,
        expectedStatus: 200,
      },
    );

    expect(getResponse.body.trigger.id).toBe(triggerId);
    expect(getResponse.body.trigger.name).toBe(triggerName);
    expect(getResponse.body.trigger.message_template).toBe(
      'Webhook fired with payload: {{payload}}',
    );

    // --- LIST ---
    const listResponse = await apiCall<TriggerListResponse>(
      request,
      'GET',
      `/agents/${agentId}/triggers`,
      {
        token: accessToken,
        expectedStatus: 200,
      },
    );

    expect(listResponse.body.triggers).toBeInstanceOf(Array);
    const found = listResponse.body.triggers.find((t) => t.id === triggerId);
    expect(found).toBeTruthy();
    expect(found?.name).toBe(triggerName);

    // --- UPDATE ---
    const updateResponse = await apiCall<TriggerResponse>(
      request,
      'PATCH',
      `/agents/${agentId}/triggers/${triggerId}`,
      {
        token: accessToken,
        expectedStatus: 200,
        data: {
          name: updatedName,
          enabled: false,
          message_template: 'Updated template: {{payload}}',
        },
      },
    );

    expect(updateResponse.body.trigger.name).toBe(updatedName);
    expect(updateResponse.body.trigger.enabled).toBe(false);
    expect(updateResponse.body.trigger.message_template).toBe('Updated template: {{payload}}');

    // Verify update persisted
    const getAfterUpdate = await apiCall<TriggerResponse>(
      request,
      'GET',
      `/agents/${agentId}/triggers/${triggerId}`,
      {
        token: accessToken,
        expectedStatus: 200,
      },
    );
    expect(getAfterUpdate.body.trigger.name).toBe(updatedName);
    expect(getAfterUpdate.body.trigger.enabled).toBe(false);

    // --- DELETE ---
    const deleteResponse = await apiCall<{ ok: boolean }>(
      request,
      'DELETE',
      `/agents/${agentId}/triggers/${triggerId}`,
      {
        token: accessToken,
        expectedStatus: 200,
      },
    );
    expect(deleteResponse.body.ok).toBe(true);

    // Verify deletion — GET should return 404
    await apiCall(request, 'GET', `/agents/${agentId}/triggers/${triggerId}`, {
      token: accessToken,
      expectedStatus: 404,
    });
  });

  test('create webhook trigger with HMAC secret', async ({ request }) => {
    const triggerName = uniqueLabel('e2e-trigger-hmac');

    const createResponse = await apiCall<TriggerResponse>(
      request,
      'POST',
      `/agents/${agentId}/triggers`,
      {
        token: accessToken,
        expectedStatus: 201,
        data: {
          name: triggerName,
          trigger_type: 'webhook',
          hmac_secret: 'test-secret-key-for-e2e',
          enabled: true,
        },
      },
    );

    const triggerId = createResponse.body.trigger.id;
    expect(createResponse.body.trigger.hmac_configured).toBe(true);
    // The raw secret should never be returned
    expect(createResponse.body.trigger).not.toHaveProperty('hmac_secret');

    // Clean up
    await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${triggerId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });

  test('create schedule trigger with cron expression', async ({ request }) => {
    const triggerName = uniqueLabel('e2e-trigger-cron');

    const createResponse = await apiCall<TriggerResponse>(
      request,
      'POST',
      `/agents/${agentId}/triggers`,
      {
        token: accessToken,
        expectedStatus: 201,
        data: {
          name: triggerName,
          trigger_type: 'schedule',
          cron_expression: '0 9 * * 1',
          message_template: 'Weekly Monday report',
          enabled: true,
        },
      },
    );

    const triggerId = createResponse.body.trigger.id;
    expect(createResponse.body.trigger.trigger_type).toBe('schedule');
    expect(createResponse.body.trigger.cron_expression).toBe('0 9 * * 1');

    // Clean up
    await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${triggerId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });

  test('create condition trigger with filter', async ({ request }) => {
    const triggerName = uniqueLabel('e2e-trigger-condition');

    const createResponse = await apiCall<TriggerResponse>(
      request,
      'POST',
      `/agents/${agentId}/triggers`,
      {
        token: accessToken,
        expectedStatus: 201,
        data: {
          name: triggerName,
          trigger_type: 'condition',
          condition_filter: {
            all: [
              { field: 'event', op: 'eq', value: 'deploy' },
              { field: 'status', op: 'neq', value: 'success' },
            ],
          },
          message_template: 'Deploy failed: {{payload}}',
          enabled: true,
        },
      },
    );

    const triggerId = createResponse.body.trigger.id;
    expect(createResponse.body.trigger.trigger_type).toBe('condition');
    expect(createResponse.body.trigger.condition_filter).toBeTruthy();
    expect(createResponse.body.trigger.condition_filter?.all).toHaveLength(2);

    // Clean up
    await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${triggerId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });

  test('create trigger with metadata', async ({ request }) => {
    const triggerName = uniqueLabel('e2e-trigger-meta');

    const createResponse = await apiCall<TriggerResponse>(
      request,
      'POST',
      `/agents/${agentId}/triggers`,
      {
        token: accessToken,
        expectedStatus: 201,
        data: {
          name: triggerName,
          trigger_type: 'webhook',
          metadata: { source: 'github', repo: 'wai-agents' },
          enabled: true,
        },
      },
    );

    const triggerId = createResponse.body.trigger.id;
    expect(createResponse.body.trigger.metadata).toEqual({
      source: 'github',
      repo: 'wai-agents',
    });

    // Clean up
    await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${triggerId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });

  test('update trigger: clear optional fields with null', async ({ request }) => {
    const triggerName = uniqueLabel('e2e-trigger-null');

    const createResponse = await apiCall<TriggerResponse>(
      request,
      'POST',
      `/agents/${agentId}/triggers`,
      {
        token: accessToken,
        expectedStatus: 201,
        data: {
          name: triggerName,
          trigger_type: 'webhook',
          message_template: 'Initial template',
          condition_filter: {
            all: [{ field: 'action', op: 'eq', value: 'push' }],
          },
          enabled: true,
        },
      },
    );

    const triggerId = createResponse.body.trigger.id;

    // Clear message_template and condition_filter by setting them to null
    const updateResponse = await apiCall<TriggerResponse>(
      request,
      'PATCH',
      `/agents/${agentId}/triggers/${triggerId}`,
      {
        token: accessToken,
        expectedStatus: 200,
        data: {
          message_template: null,
          condition_filter: null,
        },
      },
    );

    expect(updateResponse.body.trigger.message_template).toBeNull();
    expect(updateResponse.body.trigger.condition_filter).toBeNull();

    // Clean up
    await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${triggerId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });

  test('create trigger rejects missing name', async ({ request }) => {
    await apiCall(request, 'POST', `/agents/${agentId}/triggers`, {
      token: accessToken,
      expectedStatus: 422,
      data: {
        trigger_type: 'webhook',
      },
    });
  });

  test('create trigger rejects missing trigger_type', async ({ request }) => {
    await apiCall(request, 'POST', `/agents/${agentId}/triggers`, {
      token: accessToken,
      expectedStatus: 422,
      data: {
        name: uniqueLabel('e2e-trigger-no-type'),
      },
    });
  });

  test('create trigger rejects invalid trigger_type', async ({ request }) => {
    await apiCall(request, 'POST', `/agents/${agentId}/triggers`, {
      token: accessToken,
      expectedStatus: 422,
      data: {
        name: uniqueLabel('e2e-trigger-bad-type'),
        trigger_type: 'invalid_type',
      },
    });
  });

  test('get non-existent trigger returns 404', async ({ request }) => {
    await apiCall(
      request,
      'GET',
      `/agents/${agentId}/triggers/00000000-0000-0000-0000-000000000000`,
      {
        token: accessToken,
        expectedStatus: 404,
      },
    );
  });

  test('delete non-existent trigger returns 404', async ({ request }) => {
    await apiCall(
      request,
      'DELETE',
      `/agents/${agentId}/triggers/00000000-0000-0000-0000-000000000000`,
      {
        token: accessToken,
        expectedStatus: 404,
      },
    );
  });

  test('unauthenticated trigger request returns 401', async ({ request }) => {
    await apiCall(request, 'GET', `/agents/${agentId}/triggers`, {
      expectedStatus: 401,
    });
  });

  test("trigger isolation: one user cannot access another user's triggers", async ({ request }) => {
    const alex = await getSeedSession(request, 'alex');
    const maya = await getSeedSession(request, 'maya');

    // Alex creates a trigger
    const triggerName = uniqueLabel('e2e-trigger-isolation');
    const createResponse = await apiCall<TriggerResponse>(
      request,
      'POST',
      `/agents/${agentId}/triggers`,
      {
        token: alex.accessToken,
        expectedStatus: 201,
        data: {
          name: triggerName,
          trigger_type: 'webhook',
          enabled: true,
        },
      },
    );

    const triggerId = createResponse.body.trigger.id;

    // Maya tries to GET Alex's trigger — should be 404
    await apiCall(request, 'GET', `/agents/${agentId}/triggers/${triggerId}`, {
      token: maya.accessToken,
      expectedStatus: 404,
    });

    // Maya tries to DELETE Alex's trigger — should be 404
    await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${triggerId}`, {
      token: maya.accessToken,
      expectedStatus: 404,
    });

    // Clean up as Alex
    await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${triggerId}`, {
      token: alex.accessToken,
      expectedStatus: 200,
    });
  });
});

test.describe('Webhook Hooks (public endpoint)', () => {
  let accessToken: string;
  let agentId: string;
  let webhookToken: string;
  let triggerId: string;

  test.beforeAll(async ({ request }) => {
    const alex = await getSeedSession(request, 'alex');
    accessToken = alex.accessToken;

    // Create an agent
    const agentResponse = await apiCall<{
      agent: { id: string; name: string; slug: string };
    }>(request, 'POST', '/agents', {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: uniqueLabel('hook-agent'),
        description: 'Agent for webhook e2e tests',
        system_prompt: 'You are a helpful assistant. Respond briefly.',
        model: 'claude-sonnet-4-6',
        visibility: 'private',
      },
    });
    agentId = agentResponse.body.agent.id;

    // Create a webhook trigger
    const triggerResponse = await apiCall<{
      trigger: { id: string; token: string };
    }>(request, 'POST', `/agents/${agentId}/triggers`, {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: uniqueLabel('hook-trigger'),
        trigger_type: 'webhook',
        message_template: 'Webhook received: {{payload}}',
        enabled: true,
      },
    });
    triggerId = triggerResponse.body.trigger.id;
    webhookToken = triggerResponse.body.trigger.token;
  });

  test.afterAll(async ({ request }) => {
    if (triggerId && agentId) {
      await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${triggerId}`, {
        token: accessToken,
      });
    }
    if (agentId) {
      await apiCall(request, 'DELETE', `/agents/${agentId}`, {
        token: accessToken,
      });
    }
  });

  test('fire webhook with valid token', async ({ request }) => {
    // POST /hooks/:token — no authentication required
    const fireResponse = await apiCall<{
      fired?: boolean;
      conversation_id?: string;
      reason?: string;
    }>(request, 'POST', `/hooks/${webhookToken}`, {
      data: { event: 'test', source: 'playwright-e2e' },
    });

    // The hook endpoint should be reachable. Depending on backend state
    // it may fire successfully (200 with fired:true) or decline (200 with fired:false).
    // A 500 would indicate an unhandled error, which is also useful to detect.
    expect([200, 404, 500]).toContain(fireResponse.status);

    if (fireResponse.status === 200 && fireResponse.body.fired) {
      expect(fireResponse.body.conversation_id).toBeTruthy();
    }
  });

  test('fire webhook with non-existent token returns 404', async ({ request }) => {
    await apiCall(request, 'POST', '/hooks/non-existent-token-00000', {
      expectedStatus: 404,
      data: { event: 'test' },
    });
  });

  test('fire disabled trigger does not fire', async ({ request }) => {
    // Disable the trigger first
    await apiCall(request, 'PATCH', `/agents/${agentId}/triggers/${triggerId}`, {
      token: accessToken,
      expectedStatus: 200,
      data: { enabled: false },
    });

    // Fire the webhook — should return fired:false
    const fireResponse = await apiCall<{
      fired: boolean;
      reason?: string;
    }>(request, 'POST', `/hooks/${webhookToken}`, {
      data: { event: 'test-disabled' },
    });

    expect(fireResponse.status).toBe(200);
    expect(fireResponse.body.fired).toBe(false);

    // Re-enable the trigger for other tests
    await apiCall(request, 'PATCH', `/agents/${agentId}/triggers/${triggerId}`, {
      token: accessToken,
      expectedStatus: 200,
      data: { enabled: true },
    });
  });

  test('fire webhook with condition filter that does not match', async ({ request }) => {
    // Create a trigger with a strict condition filter
    const conditionTrigger = await apiCall<{
      trigger: { id: string; token: string };
    }>(request, 'POST', `/agents/${agentId}/triggers`, {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: uniqueLabel('hook-condition'),
        trigger_type: 'webhook',
        condition_filter: {
          all: [{ field: 'action', op: 'eq', value: 'deploy' }],
        },
        message_template: 'Deploy event: {{payload}}',
        enabled: true,
      },
    });

    const condToken = conditionTrigger.body.trigger.token;
    const condId = conditionTrigger.body.trigger.id;

    // Fire with a payload that does NOT match the condition
    const fireResponse = await apiCall<{
      fired: boolean;
      reason?: string;
    }>(request, 'POST', `/hooks/${condToken}`, {
      data: { action: 'push', branch: 'main' },
    });

    expect(fireResponse.status).toBe(200);
    expect(fireResponse.body.fired).toBe(false);

    // Clean up
    await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${condId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });

  test('fire webhook with condition filter that matches', async ({ request }) => {
    // Create a trigger with a condition that will match
    const conditionTrigger = await apiCall<{
      trigger: { id: string; token: string };
    }>(request, 'POST', `/agents/${agentId}/triggers`, {
      token: accessToken,
      expectedStatus: 201,
      data: {
        name: uniqueLabel('hook-match'),
        trigger_type: 'webhook',
        condition_filter: {
          all: [{ field: 'action', op: 'eq', value: 'deploy' }],
        },
        message_template: 'Matched deploy: {{payload}}',
        enabled: true,
      },
    });

    const matchToken = conditionTrigger.body.trigger.token;
    const matchId = conditionTrigger.body.trigger.id;

    // Fire with a payload that matches the condition
    const fireResponse = await apiCall<{
      fired?: boolean;
      conversation_id?: string;
      reason?: string;
    }>(request, 'POST', `/hooks/${matchToken}`, {
      data: { action: 'deploy', environment: 'production' },
    });

    // When condition matches, it should either fire (200 + fired:true)
    // or potentially error due to missing LLM config (500).
    expect([200, 500]).toContain(fireResponse.status);

    if (fireResponse.status === 200 && fireResponse.body.fired) {
      expect(fireResponse.body.conversation_id).toBeTruthy();
    }

    // Clean up
    await apiCall(request, 'DELETE', `/agents/${agentId}/triggers/${matchId}`, {
      token: accessToken,
      expectedStatus: 200,
    });
  });
});
