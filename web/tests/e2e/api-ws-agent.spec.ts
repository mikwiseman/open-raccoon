import { expect, test } from "@playwright/test";
import type { Channel, Socket } from "phoenix";
import {
  apiCall,
  connectSocket,
  getSeedSession,
  joinTopic,
  leaveAndDisconnect,
  uniqueIdempotencyKey,
  uniqueLabel
} from "./helpers/waiagents";

test("api/ws agent: start conversation and observe stream events", async ({ request }) => {
  const alex = await getSeedSession(request, "alex");

  const marketplace = await apiCall<{ items: Array<{ id: string; name: string }> }>(
    request,
    "GET",
    "/marketplace?limit=5",
    {
      token: alex.accessToken,
      expectedStatus: 200
    }
  );

  expect(marketplace.body.items.length).toBeGreaterThan(0);
  const agent = marketplace.body.items[0];

  const startResponse = await apiCall<{ conversation: { id: string; agent_id: string } }>(
    request,
    "POST",
    `/agents/${agent.id}/conversation`,
    {
      token: alex.accessToken,
      expectedStatus: 201,
      data: {}
    }
  );

  const conversationId = startResponse.body.conversation.id;

  let socket: Socket | null = null;
  let conversationChannel: Channel | null = null;
  let agentChannel: Channel | null = null;

  try {
    socket = await connectSocket(alex.accessToken);
    conversationChannel = await joinTopic(socket, `conversation:${conversationId}`);
    agentChannel = await joinTopic(socket, `agent:${conversationId}`);

    const firstAgentEvent = waitForFirstEvent(agentChannel, [
      "status",
      "token",
      "tool_call",
      "approval_requested",
      "complete",
      "error"
    ]);

    await apiCall<{ message: { id: string } }>(
      request,
      "POST",
      `/conversations/${conversationId}/messages`,
      {
        token: alex.accessToken,
        expectedStatus: 201,
        idempotencyKey: uniqueIdempotencyKey(),
        data: {
          type: "text",
          content: { text: uniqueLabel("agent-e2e") },
          metadata: {}
        }
      }
    );

    const observed = await firstAgentEvent;
    expect(["status", "token", "tool_call", "approval_requested", "complete", "error"]).toContain(
      observed.kind
    );

    if (observed.kind === "approval_requested") {
      const requestId = String((observed.payload as { request_id?: unknown }).request_id ?? "");
      expect(requestId.length).toBeGreaterThan(0);

      const approvalAck = waitForFirstEvent(agentChannel, ["approval_granted", "approval_denied"]);

      await pushChannelEvent(agentChannel, "approval_decision", {
        request_id: requestId,
        decision: "approve",
        scope: "allow_once"
      });

      const ack = await approvalAck;
      expect(["approval_granted", "approval_denied"]).toContain(ack.kind);
    }
  } finally {
    await leaveAndDisconnect(conversationChannel, null);
    await leaveAndDisconnect(agentChannel, socket);
  }
});

async function pushChannelEvent(
  channel: Channel,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    channel
      .push(event, payload, 10_000)
      .receive("ok", () => resolve())
      .receive("error", (error) => reject(new Error(`Push ${event} failed: ${JSON.stringify(error)}`)))
      .receive("timeout", () => reject(new Error(`Push ${event} timed out`)));
  });
}

async function waitForFirstEvent(
  channel: Channel,
  events: string[],
  timeoutMs = 45_000
): Promise<{ kind: string; payload: unknown }> {
  return new Promise((resolve, reject) => {
    const channelAny = channel as unknown as {
      off: (event: string, ref: number) => void;
    };

    const refs: Array<{ event: string; ref: number }> = [];
    const timeout = setTimeout(() => {
      refs.forEach(({ event, ref }) => channelAny.off(event, ref));
      reject(new Error(`Timed out waiting for agent events: ${events.join(", ")}`));
    }, timeoutMs);

    events.forEach((event) => {
      const ref = channel.on(event, (payload: unknown) => {
        clearTimeout(timeout);
        refs.forEach(({ event: offEvent, ref: offRef }) => channelAny.off(offEvent, offRef));
        resolve({ kind: event, payload });
      });

      refs.push({ event, ref });
    });
  });
}
