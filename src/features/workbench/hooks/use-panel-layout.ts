import { useCallback, useEffect, useState } from "react";

const LEFT_WIDTH_KEY = "dependency-analyser.panel.left";
const RIGHT_WIDTH_KEY = "dependency-analyser.panel.right";
const LEFT_VISIBLE_KEY = "dependency-analyser.panel.leftVisible";
const RIGHT_VISIBLE_KEY = "dependency-analyser.panel.rightVisible";

const DEFAULT_LEFT = 260;
const DEFAULT_RIGHT = 320;
const MIN_PANEL = 180;
const MAX_PANEL = 480;

function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === "0") return false;
  if (raw === "1") return true;
  return fallback;
}

export function usePanelLayout() {
  const [leftWidth, setLeftWidth] = useState(() =>
    readNumber(LEFT_WIDTH_KEY, DEFAULT_LEFT),
  );
  const [rightWidth, setRightWidth] = useState(() =>
    readNumber(RIGHT_WIDTH_KEY, DEFAULT_RIGHT),
  );
  const [leftVisible, setLeftVisible] = useState(() => readBool(LEFT_VISIBLE_KEY, true));
  const [rightVisible, setRightVisible] = useState(() => readBool(RIGHT_VISIBLE_KEY, true));

  useEffect(() => {
    localStorage.setItem(LEFT_WIDTH_KEY, String(leftWidth));
  }, [leftWidth]);

  useEffect(() => {
    localStorage.setItem(RIGHT_WIDTH_KEY, String(rightWidth));
  }, [rightWidth]);

  useEffect(() => {
    localStorage.setItem(LEFT_VISIBLE_KEY, leftVisible ? "1" : "0");
  }, [leftVisible]);

  useEffect(() => {
    localStorage.setItem(RIGHT_VISIBLE_KEY, rightVisible ? "1" : "0");
  }, [rightVisible]);

  const clampWidth = useCallback((value: number) => {
    return Math.min(MAX_PANEL, Math.max(MIN_PANEL, value));
  }, []);

  const toggleLeft = useCallback(() => setLeftVisible((v) => !v), []);
  const toggleRight = useCallback(() => setRightVisible((v) => !v), []);

  const adjustLeftWidth = useCallback(
    (delta: number) => {
      setLeftWidth((current) => clampWidth(current + delta));
    },
    [clampWidth],
  );

  const adjustRightWidth = useCallback(
    (delta: number) => {
      setRightWidth((current) => clampWidth(current + delta));
    },
    [clampWidth],
  );

  return {
    leftWidth,
    rightWidth,
    leftVisible,
    rightVisible,
    adjustLeftWidth,
    adjustRightWidth,
    toggleLeft,
    toggleRight,
    minPanel: MIN_PANEL,
    maxPanel: MAX_PANEL,
  };
}