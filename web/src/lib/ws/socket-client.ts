import { io, Socket } from "socket.io-client";

type AnyCallback = (...args: any[]) => void;

type ListenerEntry = {
  event: string;
  callback: AnyCallback;
};

function resolveSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit && explicit.length > 0) {
    return explicit;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }

  return "ws://127.0.0.1:4000";
}

export class SocketClient {
  private socket: Socket | null = null;
  private listeners: ListenerEntry[] = [];
  private joinedRooms = new Set<string>();

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    const url = resolveSocketUrl();
    this.socket = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    this.socket.on("connect", () => {
      console.log("[WS] connected, id:", this.socket?.id);
      this.resubscribe();
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[WS] disconnected:", reason);
    });

    this.socket.on("connect_error", (err) => {
      console.error("[WS] connection error:", err.message);
    });

    // Apply all existing listeners
    for (const entry of this.listeners) {
      this.socket.on(entry.event, entry.callback);
    }
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }
    this.socket.disconnect();
    this.socket = null;
    this.joinedRooms.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  joinConversation(conversationId: string): void {
    if (!this.socket) {
      return;
    }
    this.joinedRooms.add(conversationId);
    this.socket.emit("join:conversation", { conversationId });
  }

  leaveConversation(conversationId: string): void {
    if (!this.socket) {
      return;
    }
    this.joinedRooms.delete(conversationId);
    this.socket.emit("leave:conversation", { conversationId });
  }

  onMessage(callback: (msg: Record<string, unknown>) => void): () => void {
    return this.addListener("message:new", callback);
  }

  onMessageUpdated(callback: (msg: Record<string, unknown>) => void): () => void {
    return this.addListener("message:updated", callback);
  }

  onMessageDeleted(callback: (msg: Record<string, unknown>) => void): () => void {
    return this.addListener("message:deleted", callback);
  }

  onAgentEvent(callback: (event: AgentStreamEvent) => void): () => void {
    return this.addListener("agent:event", callback);
  }

  onTyping(callback: (data: { conversationId: string; userId: string; isTyping: boolean }) => void): () => void {
    return this.addListener("typing", callback);
  }

  onPresence(callback: (data: { conversationId: string; userId: string; status: string }) => void): () => void {
    return this.addListener("presence", callback);
  }

  emitTyping(conversationId: string): void {
    this.socket?.emit("typing", { conversationId });
  }

  emitStopTyping(conversationId: string): void {
    this.socket?.emit("stop_typing", { conversationId });
  }

  emitRead(conversationId: string, messageId: string): void {
    this.socket?.emit("read", { conversationId, messageId });
  }

  emitApprovalDecision(
    conversationId: string,
    requestId: string,
    decision: "approve" | "deny",
    scope: string = "allow_once"
  ): void {
    this.socket?.emit("approval_decision", {
      conversationId,
      requestId,
      decision,
      scope,
    });
  }

  emitStopAgent(conversationId: string): void {
    this.socket?.emit("agent:stop", { conversationId });
  }

  private addListener(event: string, callback: AnyCallback): () => void {
    const entry: ListenerEntry = { event, callback };
    this.listeners.push(entry);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => {
      this.listeners = this.listeners.filter((e) => e !== entry);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  private resubscribe(): void {
    // Re-join rooms after reconnection
    for (const roomId of this.joinedRooms) {
      this.socket?.emit("join:conversation", { conversationId: roomId });
    }
  }
}

export type AgentStreamEvent = {
  type:
    | "run_started"
    | "text_delta"
    | "tool_call_start"
    | "tool_call_end"
    | "thinking"
    | "run_finished"
    | "run_error"
    | "status";
  runId?: string;
  agentId?: string;
  conversationId?: string;
  text?: string;
  toolName?: string;
  toolCallId?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  durationMs?: number;
  usage?: { inputTokens: number; outputTokens: number };
  message?: string;
  error?: string;
};
