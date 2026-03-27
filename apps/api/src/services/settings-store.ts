// TODO: Replace with SQLite
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { DEFAULT_DATA_DIR, DEFAULT_UPDATE_CHECK_INTERVAL } from "@hosuto/shared";

interface Settings {
  updateCheckInterval: number;
}

const DEFAULTS: Settings = {
  updateCheckInterval: DEFAULT_UPDATE_CHECK_INTERVAL,
};

const getSettingsPath = (): string => {
  const dataDir =
    process.env.DATA_DIR || (process.env.NODE_ENV === "production" ? DEFAULT_DATA_DIR : "./data");

  return join(dataDir, "settings.json");
};

export const loadSettings = (): Settings => {
  try {
    const raw = readFileSync(getSettingsPath(), "utf-8");

    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
};

export const saveSettings = (settings: Partial<Settings>): Settings => {
  const current = loadSettings();
  const updated = { ...current, ...settings };
  const path = getSettingsPath();

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(updated, null, 2), "utf-8");

  return updated;
};
