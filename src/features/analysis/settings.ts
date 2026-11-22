import { normalizeMasks } from "../graph-filters";

import { RULE_IDS, type AnalysisSettings, type RuleId } from "./types";

const STORAGE_KEY_PREFIX = "dependency-analyser.analysis.";

export const DEFAULT_FAN_IN_THRESHOLD = 10;
export const DEFAULT_FAN_OUT_THRESHOLD = 10;

export function defaultAnalysisSettings(): AnalysisSettings {
  const enabledRules = {} as Record<RuleId, boolean>;
  for (const ruleId of RULE_IDS) enabledRules[ruleId] = true;
  return {
    enabledRules,
    fanInThreshold: DEFAULT_FAN_IN_THRESHOLD,
    fanOutThreshold: DEFAULT_FAN_OUT_THRESHOLD,
    entryPointMasks: [],
  };
}

export function parseAnalysisSettings(value: unknown): AnalysisSettings {
  const defaults = defaultAnalysisSettings();
  if (!value || typeof value !== "object") return defaults;

  const raw = value as Record<string, unknown>;
  const enabledRules = { ...defaults.enabledRules };
  if (raw.enabledRules && typeof raw.enabledRules === "object") {
    const flags = raw.enabledRules as Record<string, unknown>;
    for (const ruleId of RULE_IDS) {
      if (typeof flags[ruleId] === "boolean") enabledRules[ruleId] = flags[ruleId];
    }
  }

  return {
    enabledRules,
    fanInThreshold: positiveInt(raw.fanInThreshold, defaults.fanInThreshold),
    fanOutThreshold: positiveInt(raw.fanOutThreshold, defaults.fanOutThreshold),
    entryPointMasks: normalizeMasks(stringList(raw.entryPointMasks)),
  };
}

export function loadAnalysisSettings(projectKey: string | null): AnalysisSettings {
  if (!projectKey) return defaultAnalysisSettings();
  try {
    const raw = localStorage.getItem(storageKey(projectKey));
    if (!raw) return defaultAnalysisSettings();
    return parseAnalysisSettings(JSON.parse(raw));
  } catch {
    return defaultAnalysisSettings();
  }
}

export function saveAnalysisSettings(
  projectKey: string | null,
  settings: AnalysisSettings,
): void {
  if (!projectKey) return;
  localStorage.setItem(storageKey(projectKey), JSON.stringify(settings));
}

function storageKey(projectKey: string): string {
  return `${STORAGE_KEY_PREFIX}${projectKey}`;
}

function positiveInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return fallback;
  return value;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
