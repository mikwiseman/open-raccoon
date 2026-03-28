import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@wai/core", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  createTask, getUserTasks, getTaskById, deleteTask, toggleTask,
  getDueTasks, markTaskExecuted, calculateNextRun,
  detectScheduleIntent, formatTaskList, clearTasks,
} from "../scheduler.js";

beforeEach(() => {
  clearTasks("user-1");
  clearTasks("user-2");
});

describe("createTask", () => {
  it("creates a task with all fields", () => {
    const task = createTask("user-1", "my-cafe", "daily_digest", "daily", "Send form summary");
    expect(task.id).toBeTruthy();
    expect(task.userId).toBe("user-1");
    expect(task.slug).toBe("my-cafe");
    expect(task.type).toBe("daily_digest");
    expect(task.frequency).toBe("daily");
    expect(task.enabled).toBe(true);
    expect(task.lastRun).toBeNull();
    expect(task.nextRun).toBeDefined();
  });

  it("assigns unique IDs", () => {
    const t1 = createTask("user-1", "s", "custom", "daily", "Task 1");
    const t2 = createTask("user-1", "s", "custom", "daily", "Task 2");
    expect(t1.id).not.toBe(t2.id);
  });
});

describe("getUserTasks", () => {
  it("returns empty for new user", () => {
    expect(getUserTasks("unknown")).toEqual([]);
  });

  it("returns created tasks", () => {
    createTask("user-1", "s", "daily_digest", "daily", "Test");
    createTask("user-1", "s", "uptime_check", "hourly", "Check");
    expect(getUserTasks("user-1")).toHaveLength(2);
  });

  it("isolates per user", () => {
    createTask("user-1", "s", "custom", "daily", "U1");
    createTask("user-2", "s", "custom", "daily", "U2");
    expect(getUserTasks("user-1")).toHaveLength(1);
    expect(getUserTasks("user-2")).toHaveLength(1);
  });
});

describe("getTaskById", () => {
  it("finds task by ID", () => {
    const task = createTask("user-1", "s", "custom", "daily", "Find me");
    expect(getTaskById("user-1", task.id)?.description).toBe("Find me");
  });

  it("returns undefined for unknown ID", () => {
    expect(getTaskById("user-1", "nonexistent")).toBeUndefined();
  });
});

describe("deleteTask", () => {
  it("deletes a task", () => {
    const task = createTask("user-1", "s", "custom", "daily", "Delete me");
    expect(deleteTask("user-1", task.id)).toBe(true);
    expect(getUserTasks("user-1")).toHaveLength(0);
  });

  it("returns false for unknown task", () => {
    expect(deleteTask("user-1", "nonexistent")).toBe(false);
  });

  it("returns false for unknown user", () => {
    expect(deleteTask("unknown", "nonexistent")).toBe(false);
  });
});

describe("toggleTask", () => {
  it("toggles enabled to disabled", () => {
    const task = createTask("user-1", "s", "custom", "daily", "Toggle me");
    expect(task.enabled).toBe(true);
    toggleTask("user-1", task.id);
    expect(getTaskById("user-1", task.id)?.enabled).toBe(false);
  });

  it("toggles disabled to enabled", () => {
    const task = createTask("user-1", "s", "custom", "daily", "Toggle");
    toggleTask("user-1", task.id); // disable
    toggleTask("user-1", task.id); // enable
    expect(getTaskById("user-1", task.id)?.enabled).toBe(true);
  });

  it("returns false for unknown task", () => {
    expect(toggleTask("user-1", "nonexistent")).toBe(false);
  });
});

describe("getDueTasks", () => {
  it("returns tasks past their nextRun", () => {
    const task = createTask("user-1", "s", "custom", "hourly", "Due");
    // Manually set nextRun to past
    task.nextRun = new Date(Date.now() - 60000);
    const due = getDueTasks();
    expect(due.some((t) => t.id === task.id)).toBe(true);
  });

  it("excludes disabled tasks", () => {
    const task = createTask("user-1", "s", "custom", "hourly", "Disabled");
    task.nextRun = new Date(Date.now() - 60000);
    task.enabled = false;
    const due = getDueTasks();
    expect(due.some((t) => t.id === task.id)).toBe(false);
  });

  it("excludes future tasks", () => {
    createTask("user-1", "s", "custom", "daily", "Future");
    // nextRun is in the future by default
    const due = getDueTasks();
    expect(due).toHaveLength(0);
  });
});

describe("markTaskExecuted", () => {
  it("sets lastRun to now", () => {
    const task = createTask("user-1", "s", "custom", "hourly", "Run me");
    const before = Date.now();
    markTaskExecuted("user-1", task.id);
    expect(task.lastRun).toBeDefined();
    expect(task.lastRun!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("recalculates nextRun for hourly", () => {
    const task = createTask("user-1", "s", "custom", "hourly", "Hourly");
    task.nextRun = new Date(Date.now() - 60000); // overdue
    markTaskExecuted("user-1", task.id);
    expect(task.nextRun.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("calculateNextRun", () => {
  const base = new Date("2026-03-28T10:00:00Z");

  it("adds 1 hour for hourly", () => {
    const next = calculateNextRun("hourly", base);
    expect(next.getTime() - base.getTime()).toBe(3600000);
  });

  it("sets 9 AM next day for daily", () => {
    const next = calculateNextRun("daily", base);
    expect(next.getDate()).toBe(base.getDate() + 1);
    expect(next.getHours()).toBe(9);
  });

  it("adds 7 days for weekly", () => {
    const next = calculateNextRun("weekly", base);
    const diff = next.getTime() - base.getTime();
    expect(diff).toBeGreaterThanOrEqual(6 * 86400000);
    expect(diff).toBeLessThanOrEqual(8 * 86400000);
  });

  it("advances month for monthly", () => {
    const next = calculateNextRun("monthly", base);
    expect(next.getMonth()).toBe(base.getMonth() + 1);
  });
});

describe("detectScheduleIntent", () => {
  it("detects 'every day' + digest", () => {
    const result = detectScheduleIntent("Send me form digest every day");
    expect(result?.frequency).toBe("daily");
    expect(result?.type).toBe("daily_digest");
  });

  it("detects 'every hour' + uptime", () => {
    const result = detectScheduleIntent("Check uptime every hour");
    expect(result?.frequency).toBe("hourly");
    expect(result?.type).toBe("uptime_check");
  });

  it("detects 'every week' + report", () => {
    const result = detectScheduleIntent("Send analytics report every week");
    expect(result?.frequency).toBe("weekly");
    expect(result?.type).toBe("weekly_report");
  });

  it("detects Russian 'каждый день'", () => {
    const result = detectScheduleIntent("Присылай сводку каждый день");
    expect(result?.frequency).toBe("daily");
    expect(result?.type).toBe("daily_digest");
  });

  it("detects 'ежедневно'", () => {
    const result = detectScheduleIntent("Ежедневно проверяй сайт");
    expect(result?.frequency).toBe("daily");
    expect(result?.type).toBe("uptime_check");
  });

  it("detects 'еженедельно' + отчёт", () => {
    const result = detectScheduleIntent("Еженедельный отчёт по аналитике");
    expect(result?.frequency).toBe("weekly");
    expect(result?.type).toBe("weekly_report");
  });

  it("detects content refresh", () => {
    const result = detectScheduleIntent("Update site content every month");
    expect(result?.frequency).toBe("monthly");
    expect(result?.type).toBe("content_refresh");
  });

  it("returns undefined for non-schedule text", () => {
    expect(detectScheduleIntent("Build me a landing page")).toBeUndefined();
  });

  it("returns undefined for empty", () => {
    expect(detectScheduleIntent("")).toBeUndefined();
  });

  it("defaults to custom type for generic schedule", () => {
    const result = detectScheduleIntent("Remind me every day to do something");
    expect(result?.type).toBe("custom");
    expect(result?.frequency).toBe("daily");
  });
});

describe("formatTaskList", () => {
  it("shows 'no tasks' for empty", () => {
    const text = formatTaskList("user-1");
    expect(text).toContain("No scheduled tasks");
  });

  it("shows task count", () => {
    createTask("user-1", "s", "daily_digest", "daily", "Digest");
    createTask("user-1", "s", "uptime_check", "hourly", "Uptime");
    const text = formatTaskList("user-1");
    expect(text).toContain("2");
    expect(text).toContain("Digest");
    expect(text).toContain("Uptime");
  });

  it("shows frequency emoji", () => {
    createTask("user-1", "s", "custom", "daily", "Test");
    const text = formatTaskList("user-1");
    expect(text).toContain("📅");
  });

  it("includes cancel instruction", () => {
    createTask("user-1", "s", "custom", "daily", "Test");
    const text = formatTaskList("user-1");
    expect(text).toContain("/schedule stop");
  });
});
