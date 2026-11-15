import { useCallback, useRef, type ReactNode } from "react";

export interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
}

export function ResizeHandle({ onResize }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    lastX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const delta = event.clientX - lastX.current;
      lastX.current = event.clientX;
      onResize(delta);
    },
    [onResize],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return (
    <div
      className="wb-resize-handle"
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
  );
}

export function CollapsedRail({
  label,
  onExpand,
}: {
  label: string;
  onExpand: () => void;
}) {
  return (
    <button type="button" className="wb-collapsed-rail" onClick={onExpand} title={label}>
      {label}
    </button>
  );
}

export function PanelSlot({
  visible,
  width,
  children,
}: {
  visible: boolean;
  width: number;
  children: ReactNode;
}) {
  if (!visible) return null;
  return (
    <div className="wb-panel-slot" style={{ width }} data-visible={visible}>
      {children}
    </div>
  );
}