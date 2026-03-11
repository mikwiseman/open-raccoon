import { type Channel, Socket } from 'phoenix';
import { TopicSubscriptionRegistry } from './registry';

type PhoenixClientOptions = {
  socketUrl?: string;
  getToken?: () => string | undefined;
};

const JOIN_TIMEOUT_MS = 10_000;

export class PhoenixChannelClient {
  private readonly socket: Socket;
  private readonly channels = new Map<string, Channel>();
  private readonly joinPromises = new Map<string, Promise<Channel>>();
  private readonly registry = new TopicSubscriptionRegistry();

  constructor(options: PhoenixClientOptions = {}) {
    const socketUrl = normalizeSocketUrl(options.socketUrl ?? resolveDefaultSocketUrl());

    const socketOpts: Record<string, unknown> = {
      params: () => {
        const token = options.getToken?.();
        return token ? { token } : {};
      },
      reconnectAfterMs: (tries: number) => {
        // Exponential backoff: 1s, 2s, 5s, 10s, then cap at 30s
        return [1000, 2000, 5000, 10_000][tries - 1] ?? 30_000;
      },
    };

    this.socket = new Socket(socketUrl, socketOpts as ConstructorParameters<typeof Socket>[1]);
  }

  connect(): void {
    this.socket.connect();
  }

  disconnect(): void {
    this.channels.forEach((channel) => channel.leave());
    this.channels.clear();
    this.joinPromises.clear();
    this.socket.disconnect();
  }

  async join(topic: string, params: Record<string, unknown> = {}): Promise<Channel> {
    const existing = this.channels.get(topic);
    if (existing) {
      return existing;
    }

    const joinInFlight = this.joinPromises.get(topic);
    if (joinInFlight) {
      return joinInFlight;
    }

    const channel = this.socket.channel(topic, params);
    channel.onMessage = (event, payload) => {
      this.registry.emit(`${topic}:${event}`, payload);
      return payload;
    };

    const joinPromise = new Promise<Channel>((resolve, reject) => {
      channel
        .join(JOIN_TIMEOUT_MS)
        .receive('ok', () => {
          this.channels.set(topic, channel);
          this.joinPromises.delete(topic);
          resolve(channel);
        })
        .receive('error', (error) => {
          this.joinPromises.delete(topic);
          reject(new Error(formatJoinError(topic, error)));
        })
        .receive('timeout', () => {
          this.joinPromises.delete(topic);
          reject(new Error(`Timed out joining channel ${topic}`));
        });
    });

    this.joinPromises.set(topic, joinPromise);
    return joinPromise;
  }

  leave(topic: string): void {
    const channel = this.channels.get(topic);
    if (!channel) {
      return;
    }

    channel.leave();
    this.channels.delete(topic);
    this.joinPromises.delete(topic);
  }

  on<TPayload>(topic: string, event: string, callback: (payload: TPayload) => void): () => void {
    return this.registry.subscribe(`${topic}:${event}`, callback);
  }

  async push<TPayload = unknown>(
    topic: string,
    event: string,
    payload: Record<string, unknown>,
    timeoutMs = JOIN_TIMEOUT_MS,
  ): Promise<{ ok?: TPayload; error?: unknown }> {
    const channel = await this.join(topic);

    return new Promise((resolve) => {
      channel
        .push(event, payload, timeoutMs)
        .receive('ok', (response) => {
          resolve({ ok: response as TPayload });
        })
        .receive('error', (error) => {
          resolve({ error });
        })
        .receive('timeout', () => {
          resolve({ error: { reason: 'timeout' } });
        });
    });
  }
}

function normalizeSocketUrl(url: string): string {
  return url.endsWith('/websocket') ? url.slice(0, -10) : url;
}

function resolveDefaultSocketUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit && explicit.length > 0) {
    return explicit;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/socket`;
  }

  return 'ws://127.0.0.1:4000/socket';
}

function formatJoinError(topic: string, error: unknown): string {
  if (typeof error === 'string') {
    return `Failed to join ${topic}: ${error}`;
  }

  if (error && typeof error === 'object' && 'reason' in error) {
    return `Failed to join ${topic}: ${String((error as { reason: unknown }).reason)}`;
  }

  return `Failed to join ${topic}`;
}
