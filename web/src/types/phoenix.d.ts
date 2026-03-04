declare module "phoenix" {
  export interface Push {
    receive(status: "ok" | "error" | "timeout", callback: (response: unknown) => void): Push;
  }

  export class Channel {
    constructor(topic: string, params?: Record<string, unknown>);
    onMessage(event: string, payload: unknown, ref?: string | null): unknown;
    on(event: string, callback: (payload: unknown) => void): number;
    off(event: string, ref: number): void;
    join(timeout?: number): Push;
    leave(timeout?: number): Push;
    push(event: string, payload?: Record<string, unknown>, timeout?: number): Push;
  }

  export class Socket {
    constructor(
      endPoint: string,
      opts?: {
        params?: Record<string, unknown> | (() => Record<string, unknown>);
      }
    );
    onOpen(callback: () => void): void;
    onError(callback: (error: unknown) => void): void;
    connect(params?: Record<string, unknown>): void;
    disconnect(callback?: () => void, code?: number, reason?: string): void;
    channel(topic: string, chanParams?: Record<string, unknown>): Channel;
  }
}
