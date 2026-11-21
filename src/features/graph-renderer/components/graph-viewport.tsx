import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { isBarrelNodeId } from "../../barrel-view";
import type { GraphFocusVisual } from "../../graph-interaction";
import type { LocationColorId } from "../../location-colors";
import type { LayoutRenderModel } from "../../hierarchical-graph-layout";

import { Button } from "../../../shared/ui";

import { GraphRenderer } from "./graph-renderer";
import { viewBoxForGraphFocus } from "../utils/focus-viewport";
import { computeLayoutBounds } from "../utils/layout-bounds";
import { applyNodeOffsets, screenDeltaToViewDelta, type NodeOffset } from "../utils/node-offsets";
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
const PAN_CLICK_THRESHOLD_PX = 4;
const BARREL_DOUBLE_CLICK_MS = 450;
const EMPTY_NODE_OFFSETS: ReadonlyMap<string, NodeOffset> = new Map();

interface PanDragState {
  kind: "pan";
  startX: number;
  startY: number;
  x: number;
  y: number;
  pointerId: number;
}

interface NodeDragState {
  kind: "node";
  moduleId: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  pointerId: number;
}

type ViewportDragState = PanDragState | NodeDragState;

export interface GraphViewportProps {
  layout: LayoutRenderModel;
  padding?: number;
  focusedModuleId?: string | null;
  focusVisual?: GraphFocusVisual | null;
  locationColorByModuleId?: ReadonlyMap<string, LocationColorId> | null;
  onFocusModule?: (moduleId: string) => void;
  onClearFocus?: () => void;
  onFocusBarrel?: (barrelNodeId: string) => void;
  onToggleBarrelExpand?: (barrelNodeId: string) => void;
  expandedBarrelDirectories?: ReadonlySet<string>;
}

export function GraphViewport({
  layout,
  padding,
  focusedModuleId = null,
  focusVisual = null,
  locationColorByModuleId = null,
  onFocusModule,
  onClearFocus,
  onFocusBarrel,
  onToggleBarrelExpand,
  expandedBarrelDirectories,
}: GraphViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ViewportDragState | null>(null);
  const lastFramedFocusRef = useRef<string | null>(null);
  const lastBarrelTapRef = useRef<{ id: string; at: number } | null>(null);

  const baseViewBox = useMemo(() => {
    const bounds = computeLayoutBounds(layout.nodes, padding);
    return parseViewBox(bounds.viewBox);
  }, [layout.nodes, padding]);

  const [viewBox, setViewBox] = useState<ViewBoxRect>(baseViewBox);
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;

  const [offsetState, setOffsetState] = useState<{
    layout: LayoutRenderModel;
    offsets: ReadonlyMap<string, NodeOffset>;
  }>({ layout, offsets: EMPTY_NODE_OFFSETS });
  if (offsetState.layout !== layout) {
    setOffsetState({ layout, offsets: EMPTY_NODE_OFFSETS });
  }
  const activeOffsets =
    offsetState.layout === layout ? offsetState.offsets : EMPTY_NODE_OFFSETS;

  const displayLayout = useMemo((): LayoutRenderModel => {
    const nodes = applyNodeOffsets(layout.nodes, activeOffsets);
    if (nodes === layout.nodes) return layout;
    return { ...layout, nodes: [...nodes] };
  }, [activeOffsets, layout]);

  useEffect(() => {
    if (focusedModuleId !== null) return;
    setViewBox(baseViewBox);
    lastFramedFocusRef.current = null;
  }, [baseViewBox, focusedModuleId]);

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

  useEffect(() => {
    if (focusedModuleId === null) {
      lastFramedFocusRef.current = null;
      return;
    }
    if (!focusVisual?.active) return;

    const frameKey = `${focusedModuleId}:${[...collectHighlightKeyParts(focusVisual)].join("|")}`;
    if (lastFramedFocusRef.current === frameKey) return;

    const host = viewportRef.current;
    if (!host || host.clientWidth <= 0 || host.clientHeight <= 0) return;

    const aspect = host.clientWidth / host.clientHeight;
    const proposed = viewBoxForGraphFocus(
      displayLayout,
      focusVisual,
      aspect,
      focusedModuleId,
    );
    if (!proposed) return;

    setViewBox(clampZoom(proposed));
    lastFramedFocusRef.current = frameKey;
  }, [clampZoom, displayLayout, focusVisual, focusedModuleId]);

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

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    viewportRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = {
      kind: "pan",
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
    event.currentTarget.classList.add("is-panning");
  }, []);

  const onNodePointerDown = useCallback((event: ReactPointerEvent<SVGGElement>) => {
    const moduleId = event.currentTarget.dataset.moduleId;
    if (!moduleId) return;

    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    viewportRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = {
      kind: "node",
      moduleId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
    viewportRef.current?.classList.add("is-dragging-node");
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };

    if (drag.kind === "node") {
      const delta = screenDeltaToViewDelta(
        deltaX,
        deltaY,
        viewBoxRef.current,
        bounds.width,
        bounds.height,
      );
      if (delta.dx === 0 && delta.dy === 0) return;

      const moduleId = drag.moduleId;
      setOffsetState((current) => {
        const previous = current.offsets.get(moduleId) ?? { dx: 0, dy: 0 };
        const next = new Map(current.offsets);
        next.set(moduleId, {
          dx: previous.dx + delta.dx,
          dy: previous.dy + delta.dy,
        });
        return { layout: current.layout, offsets: next };
      });
      return;
    }

    setViewBox((current) =>
      panViewBoxByPixels(current, deltaX, deltaY, bounds.width, bounds.height),
    );
  }, []);

  const handleBarrelClick = useCallback(
    (barrelNodeId: string) => {
      const now = Date.now();
      const last = lastBarrelTapRef.current;
      if (
        last &&
        last.id === barrelNodeId &&
        now - last.at <= BARREL_DOUBLE_CLICK_MS
      ) {
        lastBarrelTapRef.current = null;
        onToggleBarrelExpand?.(barrelNodeId);
        return;
      }

      lastBarrelTapRef.current = { id: barrelNodeId, at: now };
      onFocusBarrel?.(barrelNodeId);
    },
    [onFocusBarrel, onToggleBarrelExpand],
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const distance = Math.hypot(dx, dy);

      dragRef.current = null;
      viewportRef.current?.classList.remove("is-panning", "is-dragging-node");
      viewportRef.current?.releasePointerCapture(event.pointerId);

      if (drag.kind === "node") {
        if (distance < PAN_CLICK_THRESHOLD_PX) {
          if (isBarrelNodeId(drag.moduleId)) {
            handleBarrelClick(drag.moduleId);
          } else {
            onFocusModule?.(drag.moduleId);
          }
        }
        return;
      }

      if (distance >= PAN_CLICK_THRESHOLD_PX || !onClearFocus) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".graph-node")) return;

      onClearFocus();
    },
    [handleBarrelClick, onClearFocus, onFocusModule],
  );

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
    setOffsetState({ layout, offsets: EMPTY_NODE_OFFSETS });
  }, [baseViewBox, layout]);

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
        <span className="graph-viewport-hint">
          Коліщатко — zoom, фон — pan, вершина — перетягування
        </span>
      </div>

      <div
        ref={viewportRef}
        className="graph-viewport"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerLeave={finishPointer}
        onPointerCancel={finishPointer}
        onDragStart={(event) => event.preventDefault()}
      >
        <GraphRenderer
          layout={displayLayout}
          padding={padding}
          viewBox={formatViewBox(viewBox)}
          fillContainer
          focusVisual={focusVisual}
          locationColorByModuleId={locationColorByModuleId}
          expandedBarrelDirectories={expandedBarrelDirectories}
          onNodePointerDown={onNodePointerDown}
        />
      </div>
    </div>
  );
}

function collectHighlightKeyParts(focusVisual: GraphFocusVisual): string[] {
  const parts: string[] = [];
  for (const [id, state] of focusVisual.nodeStateById) {
    if (state === "focus" || state === "related") parts.push(id);
  }
  parts.sort();
  return parts;
}