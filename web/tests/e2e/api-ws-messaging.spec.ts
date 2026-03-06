import { expect, test } from "@playwright/test";
import type { Channel, Socket } from "phoenix";
import {
  apiCall,
  connectSocket,
  getSeedSession,
  joinTopic,
  leaveAndDisconnect,
  seededUser,
  uniqueIdempotencyKey,
  uniqueLabel,
  waitForChannelEvent
} from "./helpers/waiagents";

test("api/ws messaging: DM create, send, react, edit, delete", async ({ request }) => {
  const alex = await getSeedSession(request, "alex");
  const maya = await getSeedSession(request, "maya");

  const mayaUser = await apiCall<{ user: { id: string } }>(request, "GET", `/users/${seededUser("maya").username}`, {
    token: alex.accessToken,
    expectedStatus: 200
  });

  const dmCreate = await apiCall<{ conversation: { id: string } }>(request, "POST", "/conversations", {
    token: alex.accessToken,
    data: {
      type: "dm",
      member_id: mayaUser.body.user.id
    }
  });
  expect([200, 201]).toContain(dmCreate.status);

  const conversationId = dmCreate.body.conversation.id;

  let alexSocket: Socket | null = null;
  let mayaSocket: Socket | null = null;
  let alexChannel: Channel | null = null;
  let mayaChannel: Channel | null = null;

  try {
    alexSocket = await connectSocket(alex.accessToken);
    mayaSocket = await connectSocket(maya.accessToken);

    alexChannel = await joinTopic(alexSocket, `conversation:${conversationId}`);
    mayaChannel = await joinTopic(mayaSocket, `conversation:${conversationId}`);

    const alexNewMessage = waitForChannelEvent<{ message: { id: string; content: { text: string } } }>(
      alexChannel,
      "new_message"
    );
    const mayaNewMessage = waitForChannelEvent<{ message: { id: string; content: { text: string } } }>(
      mayaChannel,
      "new_message"
    );

    const messageText = uniqueLabel("api-ws-message");

    const sendMessageResponse = await apiCall<{ message: { id: string } }>(
      request,
      "POST",
      `/conversations/${conversationId}/messages`,
      {
        token: alex.accessToken,
        expectedStatus: 201,
        idempotencyKey: uniqueIdempotencyKey(),
        data: {
          type: "text",
          content: { text: messageText },
          metadata: {}
        }
      }
    );

    const sentMessageId = sendMessageResponse.body.message.id;

    const [alexEvent, mayaEvent] = await Promise.all([alexNewMessage, mayaNewMessage]);
    expect(alexEvent.message.id).toBe(sentMessageId);
    expect(mayaEvent.message.id).toBe(sentMessageId);
    expect(mayaEvent.message.content.text).toBe(messageText);

    await pushChannelEvent(mayaChannel, "react", {
      message_id: sentMessageId,
      emoji: "👍"
    });

    const updatedText = `${messageText}-edited`;
    const editedEvent = waitForMessageEvent(mayaChannel, "message_updated", sentMessageId);

    await apiCall<{ message: { id: string } }>(
      request,
      "PATCH",
      `/conversations/${conversationId}/messages/${sentMessageId}`,
      {
        token: alex.accessToken,
        expectedStatus: 200,
        data: {
          content: { text: updatedText }
        }
      }
    );

    const edited = await editedEvent;
    expect(edited.id).toBe(sentMessageId);
    expect((edited.content as { text?: string }).text).toBe(updatedText);

    const deleteResponse = await apiCall<{ message: { id: string; deleted_at: string } }>(
      request,
      "DELETE",
      `/conversations/${conversationId}/messages/${sentMessageId}`,
      {
        token: alex.accessToken,
        expectedStatus: 200
      }
    );
    expect(deleteResponse.body.message.id).toBe(sentMessageId);
    expect(deleteResponse.body.message.deleted_at).toBeTruthy();

    const messageList = await apiCall<{ items: Array<{ id: string; deleted_at: string | null }> }>(
      request,
      "GET",
      `/conversations/${conversationId}/messages?limit=50`,
      {
        token: alex.accessToken,
        expectedStatus: 200
      }
    );

    const deletedFromList = messageList.body.items.find((message) => message.id === sentMessageId);
    expect(deletedFromList?.deleted_at).toBeTruthy();
  } finally {
    await leaveAndDisconnect(alexChannel, alexSocket);
    await leaveAndDisconnect(mayaChannel, mayaSocket);
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

function waitForMessageEvent(
  channel: Channel,
  event: string,
  messageId: string,
  timeoutMs = 20_000
): Promise<{
  id: string;
  content?: Record<string, unknown>;
  reactions?: Array<{ emoji: string }>;
  deleted_at?: string;
}> {
  return new Promise((resolve, reject) => {
    const channelAny = channel as unknown as {
      off: (event: string, ref: number) => void;
    };

    const timeout = setTimeout(() => {
      channelAny.off(event, ref);
      reject(new Error(`Timed out waiting for ${event} for message ${messageId}`));
    }, timeoutMs);

    const ref = channel.on(event, (payload: unknown) => {
      const nextMessage = normalizeMessagePayload(payload);
      if (!nextMessage || nextMessage.id !== messageId) {
        return;
      }

      clearTimeout(timeout);
      channelAny.off(event, ref);
      resolve(nextMessage);
    });
  });
}

function normalizeMessagePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = payload as Record<string, unknown>;
  const messageCandidate =
    value.message && typeof value.message === "object"
      ? (value.message as Record<string, unknown>)
      : value;

  if (typeof messageCandidate.id !== "string") {
    return null;
  }

  return messageCandidate as {
    id: string;
    content?: Record<string, unknown>;
    reactions?: Array<{ emoji: string }>;
    deleted_at?: string;
  };
}
