import { sql } from '../db/connection.js';
import { createQueue, createWorker } from './queue.js';

const QUEUE_NAME = 'trending-score';

export const trendingQueue = createQueue(QUEUE_NAME);

/**
 * Recalculate trending scores for all feed items.
 * Formula: score = (likes * 2 + forks * 3 + views * 0.1) / (age_hours + 2)^1.5
 */
export const trendingWorker = createWorker(QUEUE_NAME, async () => {
  await sql`
      UPDATE feed_items
      SET
        trending_score = (
          (like_count * 2 + fork_count * 3 + view_count * 0.1)
          / POWER(EXTRACT(EPOCH FROM (NOW() - inserted_at)) / 3600.0 + 2, 1.5)
        ),
        updated_at = NOW()
    `;
});

/**
 * Schedule the trending score recalculation to run every 15 minutes.
 */
export async function scheduleTrending(): Promise<void> {
  // Remove existing repeatable job if any
  const repeatableJobs = await trendingQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await trendingQueue.removeRepeatableByKey(job.key);
  }

  await trendingQueue.add(
    'recalculate-trending',
    {},
    {
      repeat: { every: 15 * 60 * 1000 }, // 15 minutes
    },
  );
}
