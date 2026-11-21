export const BARREL_DOUBLE_CLICK_MS = 450;

export type BarrelLastTap = { id: string; at: number };

export type BarrelPointerAction = "toggle" | "schedule_focus";

export interface ResolveBarrelPointerActionInput {
  barrelNodeId: string;
  now: number;
  lastTap: BarrelLastTap | null;
  altKey: boolean;
  doubleClickWindowMs: number;
}

export interface ResolveBarrelPointerActionResult {
  action: BarrelPointerAction;
  nextLastTap: BarrelLastTap | null;
}

export function resolveBarrelPointerAction(
  input: ResolveBarrelPointerActionInput,
): ResolveBarrelPointerActionResult {
  const { barrelNodeId, now, lastTap, altKey, doubleClickWindowMs } = input;

  if (altKey) {
    return { action: "toggle", nextLastTap: null };
  }

  if (
    lastTap &&
    lastTap.id === barrelNodeId &&
    now - lastTap.at <= doubleClickWindowMs
  ) {
    return { action: "toggle", nextLastTap: null };
  }

  return {
    action: "schedule_focus",
    nextLastTap: { id: barrelNodeId, at: now },
  };
}