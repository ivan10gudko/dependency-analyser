import { describe, expect, it } from "vitest";

import {
  BARREL_DOUBLE_CLICK_MS,
  resolveBarrelPointerAction,
} from "../barrel-pointer-action";

const BARREL = "__barrel__:src/ui";

describe("resolveBarrelPointerAction", () => {
  it("schedules focus on first click", () => {
    const now = 1_000;
    const result = resolveBarrelPointerAction({
      barrelNodeId: BARREL,
      now,
      lastTap: null,
      altKey: false,
      doubleClickWindowMs: BARREL_DOUBLE_CLICK_MS,
    });
    expect(result.action).toBe("schedule_focus");
    expect(result.nextLastTap).toEqual({ id: BARREL, at: now });
  });

  it("toggles on second click within the window", () => {
    const firstAt = 1_000;
    const result = resolveBarrelPointerAction({
      barrelNodeId: BARREL,
      now: firstAt + BARREL_DOUBLE_CLICK_MS,
      lastTap: { id: BARREL, at: firstAt },
      altKey: false,
      doubleClickWindowMs: BARREL_DOUBLE_CLICK_MS,
    });
    expect(result.action).toBe("toggle");
    expect(result.nextLastTap).toBeNull();
  });

  it("schedules focus when second click is after the window", () => {
    const firstAt = 1_000;
    const now = firstAt + BARREL_DOUBLE_CLICK_MS + 1;
    const result = resolveBarrelPointerAction({
      barrelNodeId: BARREL,
      now,
      lastTap: { id: BARREL, at: firstAt },
      altKey: false,
      doubleClickWindowMs: BARREL_DOUBLE_CLICK_MS,
    });
    expect(result.action).toBe("schedule_focus");
    expect(result.nextLastTap).toEqual({ id: BARREL, at: now });
  });

  it("toggles on Alt+click without scheduling focus", () => {
    const result = resolveBarrelPointerAction({
      barrelNodeId: BARREL,
      now: 5_000,
      lastTap: null,
      altKey: true,
      doubleClickWindowMs: BARREL_DOUBLE_CLICK_MS,
    });
    expect(result.action).toBe("toggle");
    expect(result.nextLastTap).toBeNull();
  });

  it("toggles on Alt even when a double-click window is open", () => {
    const result = resolveBarrelPointerAction({
      barrelNodeId: BARREL,
      now: 1_100,
      lastTap: { id: BARREL, at: 1_000 },
      altKey: true,
      doubleClickWindowMs: BARREL_DOUBLE_CLICK_MS,
    });
    expect(result.action).toBe("toggle");
    expect(result.nextLastTap).toBeNull();
  });
});