export interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function parseViewBox(viewBox: string): ViewBoxRect {
  const parts = viewBox.trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    throw new Error(`invalid viewBox: ${viewBox}`);
  }

  const [x, y, width, height] = parts as [number, number, number, number];
  return { x, y, width, height };
}

export function formatViewBox(rect: ViewBoxRect): string {
  return `${rect.x} ${rect.y} ${rect.width} ${rect.height}`;
}

export function zoomViewBoxAt(
  rect: ViewBoxRect,
  scale: number,
  focusX: number,
  focusY: number,
): ViewBoxRect {
  const nextWidth = rect.width * scale;
  const nextHeight = rect.height * scale;

  return {
    x: focusX - (focusX - rect.x) * scale,
    y: focusY - (focusY - rect.y) * scale,
    width: nextWidth,
    height: nextHeight,
  };
}

/** Pan in screen pixels mapped into viewBox coordinates. */
export function panViewBoxByPixels(
  rect: ViewBoxRect,
  deltaX: number,
  deltaY: number,
  viewportWidth: number,
  viewportHeight: number,
): ViewBoxRect {
  if (viewportWidth <= 0 || viewportHeight <= 0) return rect;

  return {
    ...rect,
    x: rect.x - (deltaX / viewportWidth) * rect.width,
    y: rect.y - (deltaY / viewportHeight) * rect.height,
  };
}

export function screenToViewPoint(
  rect: ViewBoxRect,
  clientX: number,
  clientY: number,
  bounds: DOMRect,
): { x: number; y: number } {
  const localX = clientX - bounds.left;
  const localY = clientY - bounds.top;
  return {
    x: rect.x + (localX / bounds.width) * rect.width,
    y: rect.y + (localY / bounds.height) * rect.height,
  };
}

export const MIN_VIEW_WIDTH_RATIO = 0.08;
export const MAX_VIEW_WIDTH_RATIO = 8;
export const MIN_VIEW_BOX_WIDTH = 72;

export interface ViewBoxZoomLimits {
  minViewWidthRatio?: number;
  maxViewWidthRatio?: number;
  minViewBoxWidth?: number;
}

export function minViewBoxWidthForBase(
  baseViewBox: ViewBoxRect,
  limits: ViewBoxZoomLimits = {},
): number {
  const ratio = limits.minViewWidthRatio ?? MIN_VIEW_WIDTH_RATIO;
  const absolute = limits.minViewBoxWidth ?? MIN_VIEW_BOX_WIDTH;
  return Math.min(baseViewBox.width * ratio, absolute);
}

export function maxViewBoxWidthForBase(
  baseViewBox: ViewBoxRect,
  limits: ViewBoxZoomLimits = {},
): number {
  const ratio = limits.maxViewWidthRatio ?? MAX_VIEW_WIDTH_RATIO;
  return baseViewBox.width * ratio;
}

export function clampViewBoxZoom(
  rect: ViewBoxRect,
  baseViewBox: ViewBoxRect,
  limits: ViewBoxZoomLimits = {},
): ViewBoxRect {
  const minWidth = minViewBoxWidthForBase(baseViewBox, limits);
  const maxWidth = maxViewBoxWidthForBase(baseViewBox, limits);
  const width = Math.min(maxWidth, Math.max(minWidth, rect.width));
  const scale = width / rect.width;

  return zoomViewBoxAt(rect, scale, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

const WHEEL_ZOOM_SENSITIVITY = 0.0016;
const WHEEL_ZOOM_STEP_MIN = 0.92;
const WHEEL_ZOOM_STEP_MAX = 1.08;
export const TOOLBAR_WHEEL_DELTA_PX = 100;

export function normalizeWheelDelta(deltaY: number, deltaMode: number): number {
  if (deltaMode === DOM_DELTA_LINE) return deltaY * 16;
  if (deltaMode === DOM_DELTA_PAGE) return deltaY * 400;
  return deltaY;
}

export function wheelZoomScaleFactor(deltaY: number, deltaMode: number): number {
  const normalized = normalizeWheelDelta(deltaY, deltaMode);
  const scale = Math.exp(normalized * WHEEL_ZOOM_SENSITIVITY);
  return Math.min(WHEEL_ZOOM_STEP_MAX, Math.max(WHEEL_ZOOM_STEP_MIN, scale));
}

const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  if (x < 0.5) return 4 * x * x * x;
  return 1 - (-2 * x + 2) ** 3 / 2;
}

export function lerpViewBox(from: ViewBoxRect, to: ViewBoxRect, t: number): ViewBoxRect {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    width: from.width + (to.width - from.width) * t,
    height: from.height + (to.height - from.height) * t,
  };
}