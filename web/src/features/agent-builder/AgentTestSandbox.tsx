"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RaccoonApi } from "@/lib/api/services";

type Props = {
  api: RaccoonApi;
  agentId: string;
  accessToken: string;
};

type SandboxMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
};

export function AgentTestSandbox({ api, agentId, accessToken }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SandboxMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    const res = await api.startAgentConversation(agentId);
    const id = res.conversation.id;
    setConversationId(id);
    return id;
  }, [api, agentId, conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setInput("");

    const userMsg: SandboxMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const convId = await ensureConversation();
      const res = await api.sendTextMessage(convId, text);
      const content = res.message.content as { text?: string };
      const agentMsg: SandboxMessage = {
        id: res.message.id,
        role: "agent",
        text: content.text ?? "(no response)",
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <fieldset className="ab-fieldset ab-sandbox" aria-label="agent-test-sandbox">
      <legend className="ab-legend">Test Sandbox</legend>

      <div className="ab-sandbox-messages">
        {messages.length === 0 && (
          <p className="ab-empty-hint">Send a message to test your agent.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`ab-sandbox-msg ab-sandbox-msg-${msg.role}`}>
            <span className="ab-sandbox-msg-role">{msg.role === "user" ? "You" : "Agent"}</span>
            <p className="ab-sandbox-msg-text">{msg.text}</p>
          </div>
        ))}
        {sending && (
          <div className="ab-sandbox-msg ab-sandbox-msg-agent">
            <span className="ab-sandbox-msg-role">Agent</span>
            <div className="loading-spinner" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <p className="error-text">{error}</p>}

      <form className="ab-sandbox-input" onSubmit={(e) => void handleSend(e)}>
        <input
          className="ab-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a test message..."
          disabled={sending}
        />
        <button type="submit" className="ab-btn ab-btn-primary" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </fieldset>
  );
}
