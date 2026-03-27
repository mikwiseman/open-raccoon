import { describe, it, expect, vi, beforeEach } from "vitest";
import { log, captureError, initSentry } from "../logger.js";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs info messages", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    log.info({ service: "test", action: "hello" });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("[INFO]");
    expect(spy.mock.calls[0][0]).toContain("[test]");
    expect(spy.mock.calls[0][0]).toContain("hello");
  });

  it("logs warn messages", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    log.warn({ service: "test", action: "warning" });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("[WARN]");
  });

  it("logs error messages", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error({ service: "test", action: "fail", error: "something broke" });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("[ERROR]");
  });

  it("includes extra context as key=value", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    log.info({ service: "test", action: "metrics", tokens: 1500, model: "haiku" });
    expect(spy.mock.calls[0][0]).toContain("tokens=1500");
    expect(spy.mock.calls[0][0]).toContain('model="haiku"');
  });

  it("includes timestamp", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    log.info({ service: "test", action: "ts" });
    expect(spy.mock.calls[0][0]).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("logs debug only in non-production", () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    log.debug({ service: "test", action: "debug-msg" });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("[DEBUG]");
    process.env.NODE_ENV = orig;
  });

  it("logs error with message parameter", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error({ service: "test", action: "err" }, "extra detail");
    expect(spy.mock.calls[0][0]).toContain("extra detail");
  });

  it("includes userId in context", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    log.info({ service: "test", action: "user", userId: "12345" });
    expect(spy.mock.calls[0][0]).toContain("12345");
  });

  it("handles context with no service or action", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    log.info({});
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("[INFO]");
  });
});

describe("captureError", () => {
  it("does nothing when Sentry is not initialized", () => {
    // Sentry isn't initialized in tests, so captureError should be a no-op
    expect(() => captureError(new Error("test"))).not.toThrow();
  });

  it("does nothing with context when Sentry not initialized", () => {
    expect(() => captureError(new Error("test"), { service: "test", userId: "123" })).not.toThrow();
  });
});

describe("initSentry", () => {
  it("does nothing when DSN is empty", async () => {
    await expect(initSentry("")).resolves.toBeUndefined();
  });

  it("does not throw on invalid DSN", async () => {
    // This may fail to import @sentry/node in test env, but should not throw
    await expect(initSentry("https://invalid@sentry.io/0")).resolves.toBeUndefined();
  });
});
