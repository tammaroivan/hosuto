import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatTimestamp, formatLogTimestamp, formatUptime, formatMB } from "../format";

describe("formatTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T14:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows time only for today", () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15, 30);
    const result = formatTimestamp(today.toISOString());
    expect(result).not.toMatch(/Mar|Jan|Feb/);
  });

  it("shows date and time for other days", () => {
    const result = formatTimestamp("2026-03-15T09:15:30Z");
    expect(result).toMatch(/Mar|15/);
  });
});

describe("formatLogTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T14:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delegates to formatTimestamp", () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15, 30);
    const result = formatLogTimestamp(today.toISOString());
    expect(result).not.toMatch(/Mar|Jan|Feb/);
  });
});

describe("formatUptime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T14:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats days and hours", () => {
    const started = new Date("2026-03-15T12:00:00Z");
    expect(formatUptime(`Up since ${started.toISOString()}`)).toBe("8 days, 2 hours");
  });

  it("formats single day", () => {
    const started = new Date("2026-03-22T10:00:00Z");
    expect(formatUptime(`Up since ${started.toISOString()}`)).toBe("1 day, 4 hours");
  });

  it("formats days without hours", () => {
    const started = new Date("2026-03-21T14:00:00Z");
    expect(formatUptime(`Up since ${started.toISOString()}`)).toBe("2 days");
  });

  it("formats hours and minutes", () => {
    const started = new Date("2026-03-23T11:30:00Z");
    expect(formatUptime(`Up since ${started.toISOString()}`)).toBe("2 hours, 30 min");
  });

  it("formats single hour", () => {
    const started = new Date("2026-03-23T12:45:00Z");
    expect(formatUptime(`Up since ${started.toISOString()}`)).toBe("1 hour, 15 min");
  });

  it("formats minutes only", () => {
    const started = new Date("2026-03-23T13:18:00Z");
    expect(formatUptime(`Up since ${started.toISOString()}`)).toBe("42 min");
  });

  it("passes through Docker status format", () => {
    expect(formatUptime("Up 2 weeks")).toBe("Up 2 weeks");
    expect(formatUptime("Up 3 hours")).toBe("Up 3 hours");
  });
});

describe("formatMB", () => {
  it("returns 0 MB for zero bytes", () => {
    expect(formatMB(0)).toBe("0 MB");
  });

  it("formats bytes as MB", () => {
    expect(formatMB(100 * 1024 * 1024)).toBe("100 MB");
  });

  it("rounds MB to nearest integer", () => {
    expect(formatMB(256.7 * 1024 * 1024)).toBe("257 MB");
  });

  it("switches to GB for 1024+ MB", () => {
    expect(formatMB(1024 * 1024 * 1024)).toBe("1.0 GB");
  });

  it("formats fractional GB", () => {
    expect(formatMB(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
  });

  it("handles small values", () => {
    expect(formatMB(1024 * 1024)).toBe("1 MB");
  });

  it("handles sub-MB values", () => {
    const result = formatMB(512 * 1024);
    expect(result).toBe("1 MB");
  });
});
