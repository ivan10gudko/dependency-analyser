import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react";

import type { LayoutRenderModel } from "../../hierarchical-graph-layout";

import { Button } from "../../../shared/ui";

import { GraphRenderer } from "./graph-renderer";
import { computeLayoutBounds } from "../utils/layout-bounds";
import {
  formatViewBox,
  panViewBoxByPixels,
  parseViewBox,
  screenToViewPoint,
  zoomViewBoxAt,
  type ViewBoxRect,
} from "../utils/view-box";

const WHEEL_ZOOM_FACTOR = 1.12;
const MIN_VIEW_WIDTH_RATIO = 0.08;
const MAX_VIEW_WIDTH_RATIO = 8;

export interface GraphViewportProps {
  layout: LayoutRenderModel;
  padding?: number;
}

export function GraphViewport({ layout, padding }: GraphViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const baseViewBox = useMemo(() => {
    const bounds = computeLayoutBounds(layout.nodes, padding);
    return parseViewBox(bounds.viewBox);
  }, [layout.nodes, padding]);

  const [viewBox, setViewBox] = useState<ViewBoxRect>(baseViewBox);

  useEffect(() => {
    setViewBox(baseViewBox);
  }, [baseViewBox]);

  const clampZoom = useCallback(
    (rect: ViewBoxRect): ViewBoxRect => {
      const minWidth = baseViewBox.width * MIN_VIEW_WIDTH_RATIO;
      const maxWidth = baseViewBox.width * MAX_VIEW_WIDTH_RATIO;
      const width = Math.min(maxWidth, Math.max(minWidth, rect.width));
      const scale = width / rect.width;

      return zoomViewBoxAt(rect, scale, rect.x + rect.width / 2, rect.y + rect.height / 2);
    },
    [baseViewBox],
  );

  const onWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const bounds = viewportRef.current?.getBoundingClientRect();
      if (!bounds) return;

      setViewBox((current) => {
        const factor = event.deltaY < 0 ? 1 / WHEEL_ZOOM_FACTOR : WHEEL_ZOOM_FACTOR;
        const focus = screenToViewPoint(current, event.clientX, event.clientY, bounds);
        return clampZoom(zoomViewBoxAt(current, factor, focus.x, focus.y));
      });
    },
    [clampZoom],
  );

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    viewportRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.classList.add("is-panning");
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };

    setViewBox((current) =>
      panViewBoxByPixels(current, deltaX, deltaY, bounds.width, bounds.height),
    );
  }, []);

  const endPan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.classList.remove("is-panning");
    viewportRef.current?.releasePointerCapture(event.pointerId);
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      setViewBox((current) => {
        const focusX = current.x + current.width / 2;
        const focusY = current.y + current.height / 2;
        return clampZoom(zoomViewBoxAt(current, factor, focusX, focusY));
      });
    },
    [clampZoom],
  );

  const resetView = useCallback(() => {
    setViewBox(baseViewBox);
  }, [baseViewBox]);

  return (
    <div className="graph-viewport-shell">
      <div className="graph-viewport-toolbar">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => zoomBy(1 / WHEEL_ZOOM_FACTOR)}
          aria-label="Zoom in"
        >
          +
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => zoomBy(WHEEL_ZOOM_FACTOR)}
          aria-label="Zoom out"
        >
          −
        </Button>
        <Button size="sm" variant="ghost" onClick={resetView}>
          Reset
        </Button>
        <span className="graph-viewport-hint">Коліщатко — zoom, перетягування — pan</span>
      </div>

      <div
        ref={viewportRef}
        className="graph-viewport"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        onPointerCancel={endPan}
        onDragStart={(event) => event.preventDefault()}
      >
        <GraphRenderer layout={layout} padding={padding} viewBox={formatViewBox(viewBox)} fillContainer />
      </div>
    </div>
  );
}