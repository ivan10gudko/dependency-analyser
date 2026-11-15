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