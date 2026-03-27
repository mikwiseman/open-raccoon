import { describe, it, expect, vi, beforeEach } from "vitest";
import { log } from "../logger.js";

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
});
