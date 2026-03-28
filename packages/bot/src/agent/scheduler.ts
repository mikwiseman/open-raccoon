/**
 * Site Scheduler — proactive tasks for generated sites.
 *
 * From OpenClaw's HEARTBEAT pattern: the bot reaches out proactively.
 *
 * Scheduled tasks:
 * - Daily digest: send form submission summary
 * - Weekly report: site analytics summary
 * - Content refresh: prompt user to update site content
 * - Uptime check: verify site is accessible
 *
 * Each user can have multiple scheduled tasks per site.
 */

import { log } from "@wai/core";

export type TaskType = "daily_digest" | "weekly_report" | "content_refresh" | "uptime_check" | "custom";
export type TaskFrequency = "hourly" | "daily" | "weekly" | "monthly";

/** A scheduled task. */
export interface ScheduledTask {
  id: string;
  userId: string;
  slug: string;
  type: TaskType;
  frequency: TaskFrequency;
  description: string;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date;
  createdAt: Date;
}

/** Per-user task store. */
const taskStore = new Map<string, ScheduledTask[]>();
let nextId = 1;

/**
 * Create a scheduled task.
 */
export function createTask(
  userId: string,
  slug: string,
  type: TaskType,
  frequency: TaskFrequency,
  description: string,
): ScheduledTask {
  const task: ScheduledTask = {
    id: `task-${nextId++}`,
    userId,
    slug,
    type,
    frequency,
    description,
    enabled: true,
    lastRun: null,
    nextRun: calculateNextRun(frequency),
    createdAt: new Date(),
  };

  if (!taskStore.has(userId)) {
    taskStore.set(userId, []);
  }
  taskStore.get(userId)!.push(task);

  log.info({ service: "scheduler", action: "task-created", userId, slug, type, frequency, taskId: task.id });
  return task;
}

/**
 * Get all tasks for a user.
 */
export function getUserTasks(userId: string): ScheduledTask[] {
  return taskStore.get(userId) ?? [];
}

/**
 * Get a task by ID.
 */
export function getTaskById(userId: string, taskId: string): ScheduledTask | undefined {
  return getUserTasks(userId).find((t) => t.id === taskId);
}

/**
 * Delete a task.
 */
export function deleteTask(userId: string, taskId: string): boolean {
  const tasks = taskStore.get(userId);
  if (!tasks) return false;

  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return false;

  tasks.splice(index, 1);
  log.info({ service: "scheduler", action: "task-deleted", userId, taskId });
  return true;
}

/**
 * Toggle a task enabled/disabled.
 */
export function toggleTask(userId: string, taskId: string): boolean {
  const task = getTaskById(userId, taskId);
  if (!task) return false;

  task.enabled = !task.enabled;
  log.info({ service: "scheduler", action: "task-toggled", userId, taskId, enabled: task.enabled });
  return true;
}

/**
 * Get all tasks that are due to run.
 */
export function getDueTasks(): ScheduledTask[] {
  const now = new Date();
  const due: ScheduledTask[] = [];

  for (const [, tasks] of taskStore) {
    for (const task of tasks) {
      if (task.enabled && task.nextRun <= now) {
        due.push(task);
      }
    }
  }

  return due;
}

/**
 * Mark a task as executed and schedule next run.
 */
export function markTaskExecuted(userId: string, taskId: string) {
  const task = getTaskById(userId, taskId);
  if (!task) return;

  task.lastRun = new Date();
  task.nextRun = calculateNextRun(task.frequency);
  log.info({ service: "scheduler", action: "task-executed", userId, taskId, nextRun: task.nextRun.toISOString() });
}

/**
 * Calculate next run time based on frequency.
 */
export function calculateNextRun(frequency: TaskFrequency, from?: Date): Date {
  const base = from ?? new Date();
  const next = new Date(base);

  switch (frequency) {
    case "hourly":
      next.setHours(next.getHours() + 1);
      break;
    case "daily":
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0); // 9:00 AM
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      next.setHours(9, 0, 0, 0);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(9, 0, 0, 0);
      break;
  }

  return next;
}

/**
 * Detect schedule intent from user message.
 * Returns frequency and task type if detected.
 */
export function detectScheduleIntent(text: string): {
  frequency: TaskFrequency;
  type: TaskType;
  description: string;
} | undefined {
  const lower = text.toLowerCase();

  // Frequency detection
  let frequency: TaskFrequency | undefined;
  if (/every\s*hour|каждый\s*час|ежечасн/i.test(text)) frequency = "hourly";
  else if (/every\s*day|daily|каждый\s*день|ежедневн/i.test(text)) frequency = "daily";
  else if (/every\s*week|weekly|каждую?\s*недел|еженедельн/i.test(text)) frequency = "weekly";
  else if (/every\s*month|monthly|каждый\s*месяц|ежемесячн/i.test(text)) frequency = "monthly";

  if (!frequency) return undefined;

  // Type detection
  let type: TaskType = "custom";
  if (/digest|summary|итог|сводк/i.test(lower)) type = "daily_digest";
  else if (/report|отчёт|отчет|analytics|аналитик/i.test(lower)) type = "weekly_report";
  else if (/refresh|update|обнов/i.test(lower)) type = "content_refresh";
  else if (/uptime|check|ping|провер/i.test(lower)) type = "uptime_check";

  // Clean description
  const description = text
    .replace(/every\s*(hour|day|week|month)/gi, "")
    .replace(/каждый\s*(час|день|неделю|месяц)/gi, "")
    .replace(/ежедневн\w*|еженедельн\w*|ежемесячн\w*|ежечасн\w*/gi, "")
    .trim() || `${type} (${frequency})`;

  log.info({ service: "scheduler", action: "intent-detected", frequency, type });
  return { frequency, type, description };
}

/**
 * Format task list for Telegram.
 */
export function formatTaskList(userId: string): string {
  const tasks = getUserTasks(userId);

  if (tasks.length === 0) {
    return "⏰ No scheduled tasks.\n\nExamples:\n• `Send me form digest every day`\n• `Check uptime every hour`";
  }

  const freqEmoji: Record<TaskFrequency, string> = {
    hourly: "🔄", daily: "📅", weekly: "📆", monthly: "🗓️",
  };

  const lines = [`⏰ *Scheduled Tasks* (${tasks.length})\n`];

  for (const task of tasks) {
    const status = task.enabled ? "✅" : "⏸️";
    const freq = freqEmoji[task.frequency] ?? "⏰";
    lines.push(`${status} ${freq} \`${task.id}\`: ${task.description}`);
    if (task.lastRun) {
      lines.push(`   Last: ${task.lastRun.toISOString().slice(0, 16).replace("T", " ")}`);
    }
  }

  lines.push("\n_/schedule stop <id> to cancel_");
  return lines.join("\n");
}

/**
 * Clear all tasks for a user (for testing).
 */
export function clearTasks(userId: string) {
  taskStore.delete(userId);
}
