import {
  type ConnectionOptions,
  Queue,
  type QueueOptions,
  Worker,
  type WorkerOptions,
} from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
}) as unknown as ConnectionOptions;

export { connection };

export function createQueue(name: string, opts?: Partial<QueueOptions>): Queue {
  return new Queue(name, { connection, ...opts });
}

export function createWorker<T = unknown>(
  name: string,
  processor: (job: { data: T; name: string; id?: string }) => Promise<void>,
  opts?: Partial<WorkerOptions>,
): Worker {
  return new Worker(name, processor, { connection, ...opts });
}
