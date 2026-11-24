import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { barrelFolderFromNodeId, isBarrelNodeId } from "../../barrel-view";
import type { IssueHighlight } from "../../analysis";
import {
  isHighlightedNodeState,
  type GraphFocusVisual,
} from "../../graph-interaction/types";
import type { LocationColorId } from "../../location-colors";
import type { LayoutRenderModel } from "../../hierarchical-graph-layout";

import { Button, HelpHint, IconButton } from "../../../shared/ui";

import {
  BARREL_DOUBLE_CLICK_MS,
  resolveBarrelPointerAction,
} from "../barrel-pointer-action";
import { GraphRenderer } from "./graph-renderer";
import {
  resolveBarrelToggleTargetViewBox,
  resolveFocusFramePlan,
  type FocusFramePlan,
} from "../utils/focus-viewport";
import { computeLayoutBounds } from "../utils/layout-bounds";
import { applyNodeOffsets, screenDeltaToViewDelta, type NodeOffset } from "../utils/node-offsets";
import {
  clampViewBoxZoom,
  easeInOutCubic,
  formatViewBox,
  graphDetailLevel,
  lerpViewBox,
  panViewBoxByPixels,
  parseViewBox,
  screenToViewPoint,
  TOOLBAR_WHEEL_DELTA_PX,
  wheelZoomScaleFactor,
  zoomViewBoxAt,
  type ViewBoxRect,
} from "../utils/view-box";

const FOCUS_FRAME_DIRECT_MS = 480;
const FOCUS_REVEAL_OUT_MS = 720;
const FOCUS_REVEAL_HOLD_MS = 650;
const FOCUS_REVEAL_IN_MS = 360;
const PAN_CLICK_THRESHOLD_PX = 4;
const WHEEL_GESTURE_IDLE_MS = 150;
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
  issueHighlight?: IssueHighlight | null;
  issueOnly?: boolean;
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
  issueHighlight = null,
  issueOnly = false,
  locationColorByModuleId = null,
  onFocusModule,
  onClearFocus,
  onFocusBarrel,
  onToggleBarrelExpand,
  expandedBarrelDirectories,
}: GraphViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<ViewportDragState | null>(null);
  const lastFramedFocusRef = useRef<string | null>(null);
  const lastBarrelTapRef = useRef<{ id: string; at: number } | null>(null);
  const pendingBarrelFocusRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBarrelToggleRef = useRef<{
    barrelNodeId: string;
    targetExpanded: boolean;
    priorViewBox: ViewBoxRect;
    previousLayout: LayoutRenderModel;
  } | null>(null);
  const revealOriginViewBoxRef = useRef<ViewBoxRect | null>(null);
  const focusFrameAnimationRef = useRef<number | null>(null);
  const focusRevealHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewFrameRef = useRef<number | null>(null);
  const wheelIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseViewBox = useMemo(() => {
    const bounds = computeLayoutBounds(layout.nodes, padding);
    return parseViewBox(bounds.viewBox);
  }, [layout.nodes, padding]);

  const viewBoxRef = useRef(baseViewBox);
  const seenBaseRef = useRef(baseViewBox);
  if (seenBaseRef.current !== baseViewBox) {
    seenBaseRef.current = baseViewBox;
    if (!pendingBarrelToggleRef.current) {
      viewBoxRef.current = baseViewBox;
      lastFramedFocusRef.current = null;
      revealOriginViewBoxRef.current = null;
    }
  }

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

  const writeViewBoxDom = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.setAttribute("viewBox", formatViewBox(viewBoxRef.current));

    const viewportWidth = viewportRef.current?.clientWidth ?? 0;
    const viewportHeight = viewportRef.current?.clientHeight ?? 0;
    const detail = graphDetailLevel(
      viewBoxRef.current.width,
      viewportWidth,
      undefined,
      undefined,
      viewBoxRef.current.height,
      viewportHeight,
    );
    if (svg.getAttribute("data-detail") === detail) return;
    svg.setAttribute("data-detail", detail);
  }, []);

  const scheduleViewBox = useCallback(
    (next: ViewBoxRect) => {
      viewBoxRef.current = next;
      if (viewFrameRef.current !== null) return;
      viewFrameRef.current = requestAnimationFrame(() => {
        viewFrameRef.current = null;
        writeViewBoxDom();
      });
    },
    [writeViewBoxDom],
  );

  const applyViewBoxNow = useCallback(
    (next: ViewBoxRect) => {
      viewBoxRef.current = next;
      if (viewFrameRef.current !== null) {
        cancelAnimationFrame(viewFrameRef.current);
        viewFrameRef.current = null;
      }
      writeViewBoxDom();
    },
    [writeViewBoxDom],
  );

  const clampZoom = useCallback(
    (rect: ViewBoxRect): ViewBoxRect => clampViewBoxZoom(rect, baseViewBox),
    [baseViewBox],
  );

  const cancelFocusFrameAnimation = useCallback((options?: { keepRevealOrigin?: boolean }) => {
    if (focusFrameAnimationRef.current !== null) {
      cancelAnimationFrame(focusFrameAnimationRef.current);
      focusFrameAnimationRef.current = null;
    }
    if (focusRevealHoldTimerRef.current !== null) {
      clearTimeout(focusRevealHoldTimerRef.current);
      focusRevealHoldTimerRef.current = null;
    }
    if (!options?.keepRevealOrigin) {
      revealOriginViewBoxRef.current = null;
    }
  }, []);

  const animateViewBoxBetween = useCallback(
    (from: ViewBoxRect, to: ViewBoxRect, durationMs: number, onDone?: () => void) => {
      const start = performance.now();

      const step = (now: number) => {
        const t = easeInOutCubic((now - start) / durationMs);
        if (t < 1) {
          applyViewBoxNow(lerpViewBox(from, to, t));
          focusFrameAnimationRef.current = requestAnimationFrame(step);
        } else {
          applyViewBoxNow(to);
          focusFrameAnimationRef.current = null;
          onDone?.();
        }
      };

      focusFrameAnimationRef.current = requestAnimationFrame(step);
    },
    [applyViewBoxNow],
  );

  const runFocusFramePlan = useCallback(
    (plan: FocusFramePlan, revealOrigin?: ViewBoxRect) => {
      cancelFocusFrameAnimation({ keepRevealOrigin: true });

      if (plan.mode === "direct") {
        revealOriginViewBoxRef.current = null;
        animateViewBoxBetween(plan.prior, plan.target, FOCUS_FRAME_DIRECT_MS);
        return;
      }

      revealOriginViewBoxRef.current = revealOrigin ?? plan.settle;
      animateViewBoxBetween(plan.prior, plan.overview, FOCUS_REVEAL_OUT_MS, () => {
        focusRevealHoldTimerRef.current = setTimeout(() => {
          focusRevealHoldTimerRef.current = null;
          animateViewBoxBetween(plan.overview, plan.settle, FOCUS_REVEAL_IN_MS, () => {
            revealOriginViewBoxRef.current = null;
          });
        }, FOCUS_REVEAL_HOLD_MS);
      });
    },
    [animateViewBoxBetween, cancelFocusFrameAnimation],
  );

  useLayoutEffect(() => {
    writeViewBoxDom();
  });

  useEffect(() => {
    const host = viewportRef.current;
    if (!host) return;
    const observer = new ResizeObserver(() => {
      writeViewBoxDom();
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [writeViewBoxDom]);

  useEffect(
    () => () => {
      cancelFocusFrameAnimation();
      if (viewFrameRef.current !== null) {
        cancelAnimationFrame(viewFrameRef.current);
        viewFrameRef.current = null;
      }
      if (wheelIdleTimerRef.current !== null) {
        clearTimeout(wheelIdleTimerRef.current);
        wheelIdleTimerRef.current = null;
      }
    },
    [cancelFocusFrameAnimation],
  );

  const markWheeling = useCallback(() => {
    viewportRef.current?.classList.add("is-wheeling");
    if (wheelIdleTimerRef.current !== null) clearTimeout(wheelIdleTimerRef.current);
    wheelIdleTimerRef.current = setTimeout(() => {
      wheelIdleTimerRef.current = null;
      viewportRef.current?.classList.remove("is-wheeling");
    }, WHEEL_GESTURE_IDLE_MS);
  }, []);

  useEffect(() => {
    const pendingToggle = pendingBarrelToggleRef.current;
    if (pendingToggle) {
      if (pendingToggle.previousLayout === layout) return;
      pendingBarrelToggleRef.current = null;

      const host = viewportRef.current;
      if (host && host.clientWidth > 0 && host.clientHeight > 0) {
        const aspect = host.clientWidth / host.clientHeight;
        const target = resolveBarrelToggleTargetViewBox(
          displayLayout,
          pendingToggle.barrelNodeId,
          pendingToggle.targetExpanded,
          aspect,
          pendingToggle.priorViewBox,
        );
        if (target) {
          runFocusFramePlan({
            mode: "direct",
            prior: { ...viewBoxRef.current },
            target: clampZoom(target),
          });
        }
      }

      if (focusedModuleId !== null && focusVisual?.active) {
        lastFramedFocusRef.current = `${focusedModuleId}:${[...collectHighlightKeyParts(focusVisual)].join("|")}`;
      } else {
        lastFramedFocusRef.current = null;
      }
      return;
    }

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
    const prior = { ...viewBoxRef.current };
    const settleScaleBase = revealOriginViewBoxRef.current
      ? { ...revealOriginViewBoxRef.current }
      : prior;
    const plan = resolveFocusFramePlan(
      displayLayout,
      focusVisual,
      aspect,
      focusedModuleId,
      prior,
      baseViewBox,
      settleScaleBase,
    );
    if (!plan) return;

    const clampedPlan: FocusFramePlan =
      plan.mode === "direct"
        ? { ...plan, target: clampZoom(plan.target) }
        : {
            ...plan,
            overview: clampZoom(plan.overview),
            settle: clampZoom(plan.settle),
          };

    runFocusFramePlan(clampedPlan, settleScaleBase);
    lastFramedFocusRef.current = frameKey;
  }, [
    baseViewBox,
    clampZoom,
    displayLayout,
    expandedBarrelDirectories,
    focusVisual,
    focusedModuleId,
    layout,
    runFocusFramePlan,
  ]);

  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      cancelFocusFrameAnimation();
      const bounds = viewportRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const current = viewBoxRef.current;
      const factor = wheelZoomScaleFactor(event.deltaY, event.deltaMode);
      const focus = screenToViewPoint(current, event.clientX, event.clientY, bounds);
      scheduleViewBox(clampZoom(zoomViewBoxAt(current, factor, focus.x, focus.y)));
      markWheeling();
    },
    [cancelFocusFrameAnimation, clampZoom, markWheeling, scheduleViewBox],
  );

  useEffect(() => {
    const host = viewportRef.current;
    if (!host) return;
    host.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => host.removeEventListener("wheel", onWheel, { capture: true });
  }, [onWheel]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".graph-viewport-overlay, .graph-controls-pill, button, a")
      ) {
        return;
      }
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
    },
    [],
  );

  const onNodePointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
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
    },
    [],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const bounds = viewportRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const dragDistance = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    );
    const hasFocusAnimation =
      focusFrameAnimationRef.current !== null ||
      focusRevealHoldTimerRef.current !== null;
    if (dragDistance < PAN_CLICK_THRESHOLD_PX && hasFocusAnimation) {
      return;
    }
    if (dragDistance >= PAN_CLICK_THRESHOLD_PX) {
      cancelFocusFrameAnimation();
    }

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

    scheduleViewBox(
      panViewBoxByPixels(viewBoxRef.current, deltaX, deltaY, bounds.width, bounds.height),
    );
  }, [cancelFocusFrameAnimation, scheduleViewBox]);

  const cancelPendingBarrelFocus = useCallback(() => {
    if (pendingBarrelFocusRef.current === null) return;
    clearTimeout(pendingBarrelFocusRef.current);
    pendingBarrelFocusRef.current = null;
  }, []);

  useEffect(() => () => cancelPendingBarrelFocus(), [cancelPendingBarrelFocus]);

  const handleBarrelClick = useCallback(
    (barrelNodeId: string, modifiers: { altKey: boolean }) => {
      const result = resolveBarrelPointerAction({
        barrelNodeId,
        now: Date.now(),
        lastTap: lastBarrelTapRef.current,
        altKey: modifiers.altKey,
        doubleClickWindowMs: BARREL_DOUBLE_CLICK_MS,
      });

      lastBarrelTapRef.current = result.nextLastTap;

      if (result.action === "toggle") {
        cancelPendingBarrelFocus();
        if (onToggleBarrelExpand) {
          const barrelDir = barrelFolderFromNodeId(barrelNodeId);
          const currentlyExpanded =
            barrelDir !== null && (expandedBarrelDirectories?.has(barrelDir) ?? false);
          const priorViewBox = {
            ...(revealOriginViewBoxRef.current ?? viewBoxRef.current),
          };
          pendingBarrelToggleRef.current = {
            barrelNodeId,
            targetExpanded: !currentlyExpanded,
            priorViewBox,
            previousLayout: layout,
          };
          onToggleBarrelExpand(barrelNodeId);
        }
        return;
      }

      cancelPendingBarrelFocus();
      pendingBarrelFocusRef.current = setTimeout(() => {
        pendingBarrelFocusRef.current = null;
        lastBarrelTapRef.current = null;
        onFocusBarrel?.(barrelNodeId);
      }, BARREL_DOUBLE_CLICK_MS);
    },
    [
      cancelPendingBarrelFocus,
      expandedBarrelDirectories,
      layout,
      onFocusBarrel,
      onToggleBarrelExpand,
    ],
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
      if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
        viewportRef.current.releasePointerCapture(event.pointerId);
      }

      if (drag.kind === "node") {
        if (distance < PAN_CLICK_THRESHOLD_PX) {
          if (isBarrelNodeId(drag.moduleId)) {
            handleBarrelClick(drag.moduleId, { altKey: event.altKey });
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
      cancelFocusFrameAnimation();
      const current = viewBoxRef.current;
      const focusX = current.x + current.width / 2;
      const focusY = current.y + current.height / 2;
      scheduleViewBox(clampZoom(zoomViewBoxAt(current, factor, focusX, focusY)));
    },
    [cancelFocusFrameAnimation, clampZoom, scheduleViewBox],
  );

  const resetView = useCallback(() => {
    cancelFocusFrameAnimation();
    applyViewBoxNow(baseViewBox);
    setOffsetState({ layout, offsets: EMPTY_NODE_OFFSETS });
  }, [applyViewBoxNow, baseViewBox, cancelFocusFrameAnimation, layout]);

  return (
    <div className="graph-viewport-shell">
      <div
        ref={viewportRef}
        className="graph-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onLostPointerCapture={finishPointer}
        onDragStart={(event) => event.preventDefault()}
      >
        <GraphRenderer
          ref={svgRef}
          layout={displayLayout}
          padding={padding}
          viewBox={formatViewBox(baseViewBox)}
          fillContainer
          focusVisual={focusVisual}
          issueHighlight={issueHighlight}
          issueOnly={issueOnly}
          locationColorByModuleId={locationColorByModuleId}
          expandedBarrelDirectories={expandedBarrelDirectories}
          onNodePointerDown={onNodePointerDown}
        />

        <div
          className="graph-viewport-overlay"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {focusVisual?.active && !issueOnly && (
            <div className="graph-focus-legend-float">
              <span className="graph-focus-legend-item">
                <span className="graph-focus-legend-swatch graph-focus-legend-swatch--descendant" />
                Dependencies
              </span>
              <span className="graph-focus-legend-item">
                <span className="graph-focus-legend-swatch graph-focus-legend-swatch--ancestor" />
                Dependents
              </span>
            </div>
          )}
          <div className="graph-controls-pill">
            <IconButton
              className="graph-controls-pill-btn"
              label="Zoom in"
              onClick={() =>
                zoomBy(wheelZoomScaleFactor(-TOOLBAR_WHEEL_DELTA_PX, 0))
              }
            >
              +
            </IconButton>
            <IconButton
              className="graph-controls-pill-btn"
              label="Zoom out"
              onClick={() =>
                zoomBy(wheelZoomScaleFactor(TOOLBAR_WHEEL_DELTA_PX, 0))
              }
            >
              −
            </IconButton>
            <span className="graph-controls-divider" aria-hidden />
            <Button
              size="sm"
              variant="ghost"
              className="graph-controls-reset"
              onClick={resetView}
            >
              Reset
            </Button>
            <HelpHint
              label="Graph navigation"
              content={
                <>
                  Коліщатко — zoom, фон — pan, вершина — перетягування
                </>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function collectHighlightKeyParts(focusVisual: GraphFocusVisual): string[] {
  const parts: string[] = [];
  for (const [id, state] of focusVisual.nodeStateById) {
    if (isHighlightedNodeState(state)) parts.push(id);
  }
  parts.sort();
  return parts;
}