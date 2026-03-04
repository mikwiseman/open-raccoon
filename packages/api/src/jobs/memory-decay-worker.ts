import { createQueue, createWorker } from './queue.js';
import { sql } from '../db/connection.js';

const QUEUE_NAME = 'memory-decay';

export const memoryDecayQueue = createQueue(QUEUE_NAME);

/**
 * Decay old agent memories:
 * 1. Multiply decay_factor by 0.995 for memories older than 24 hours.
 * 2. Delete memories with decay_factor < 0.01.
 */
export const memoryDecayWorker = createWorker(
  QUEUE_NAME,
  async () => {
    // Step 1: Apply decay to memories older than 24 hours
    await sql`
      UPDATE agent_memories
      SET decay_factor = decay_factor * 0.995,
          updated_at = NOW()
      WHERE inserted_at < NOW() - INTERVAL '24 hours'
        AND decay_factor >= 0.01
    `;

    // Step 2: Delete memories with decay_factor below threshold
    await sql`
      DELETE FROM agent_memories
      WHERE decay_factor < 0.01
    `;
  },
);

/**
 * Schedule memory decay to run every hour.
 */
export async function scheduleMemoryDecay(): Promise<void> {
  const repeatableJobs = await memoryDecayQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await memoryDecayQueue.removeRepeatableByKey(job.key);
  }

  await memoryDecayQueue.add(
    'decay-memories',
    {},
    {
      repeat: { every: 60 * 60 * 1000 }, // 1 hour
    },
  );
}
