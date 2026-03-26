import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSettings, saveSettings } from "../settings-store";

const TEST_DIR = join(import.meta.dirname, "__fixtures_settings__");

beforeEach(() => {
  process.env.DATA_DIR = TEST_DIR;
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env.DATA_DIR;
});

describe("loadSettings", () => {
  it("returns defaults when no settings file exists", () => {
    const settings = loadSettings();

    expect(settings.updateCheckInterval).toBe(86400);
  });

  it("reads settings from file", () => {
    const settingsPath = join(TEST_DIR, "settings.json");
    mkdirSync(TEST_DIR, { recursive: true });
    const content = JSON.stringify({ updateCheckInterval: 3600 });
    writeFileSync(settingsPath, content);

    const settings = loadSettings();

    expect(settings.updateCheckInterval).toBe(3600);
  });

  it("returns defaults for corrupt file", () => {
    const settingsPath = join(TEST_DIR, "settings.json");
    writeFileSync(settingsPath, "not json");

    const settings = loadSettings();

    expect(settings.updateCheckInterval).toBe(86400);
  });
});

describe("saveSettings", () => {
  it("persists settings to file", () => {
    saveSettings({ updateCheckInterval: 300 });

    const raw = readFileSync(join(TEST_DIR, "settings.json"), "utf-8");
    const parsed = JSON.parse(raw);

    expect(parsed.updateCheckInterval).toBe(300);
  });

  it("merges with existing settings", () => {
    saveSettings({ updateCheckInterval: 300 });
    saveSettings({ updateCheckInterval: 600 });

    const settings = loadSettings();

    expect(settings.updateCheckInterval).toBe(600);
  });

  it("creates data directory if missing", () => {
    rmSync(TEST_DIR, { recursive: true, force: true });

    saveSettings({ updateCheckInterval: 1800 });

    const settings = loadSettings();
    expect(settings.updateCheckInterval).toBe(1800);
  });
});
