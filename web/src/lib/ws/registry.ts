export type TopicCallback<TPayload = unknown> = (payload: TPayload) => void;

type TopicMap = Map<string, Set<TopicCallback>>;

export class TopicSubscriptionRegistry {
  private readonly subscribers: TopicMap = new Map();

  subscribe<TPayload>(topic: string, callback: TopicCallback<TPayload>): () => void {
    const existing = this.subscribers.get(topic) ?? new Set<TopicCallback>();
    existing.add(callback as TopicCallback);
    this.subscribers.set(topic, existing);

    return () => {
      const current = this.subscribers.get(topic);
      if (!current) {
        return;
      }
      current.delete(callback as TopicCallback);
      if (current.size === 0) {
        this.subscribers.delete(topic);
      }
    };
  }

  emit<TPayload>(topic: string, payload: TPayload): void {
    const callbacks = this.subscribers.get(topic);
    if (!callbacks) {
      return;
    }

    callbacks.forEach((callback) => {
      callback(payload);
    });
  }

  hasSubscribers(topic: string): boolean {
    return Boolean(this.subscribers.get(topic)?.size);
  }
}
