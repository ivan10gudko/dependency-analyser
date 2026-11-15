import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "dependency-analyser.theme";

function readStoredTheme(): ThemePreference {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveEffectiveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return preference;
}

function applyTheme(preference: ThemePreference): void {
  const effective = resolveEffectiveTheme(preference);
  document.documentElement.dataset.theme = effective;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    applyTheme(readStoredTheme());
    return readStoredTheme();
  });

  const setPreference = useCallback((next: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, next);
    setPreferenceState(next);
    applyTheme(next);
  }, []);

  useEffect(() => {
    applyTheme(preference);
    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  return {
    preference,
    effective: resolveEffectiveTheme(preference),
    setPreference,
  };
}