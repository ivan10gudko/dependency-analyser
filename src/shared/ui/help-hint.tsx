import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const VIEWPORT_MARGIN = 8;
const GAP = 6;
const DEFAULT_MAX_WIDTH = 280;

export interface HelpHintProps {
  content: ReactNode;
  label: string;
}

interface PopoverPlacement {
  top: number;
  left: number;
  maxWidth: number;
}

function placementForTrigger(
  rect: DOMRect,
  popoverHeight = 160,
): PopoverPlacement {
  const maxWidth = Math.min(
    DEFAULT_MAX_WIDTH,
    window.innerWidth - VIEWPORT_MARGIN * 2,
  );

  let left = rect.right - maxWidth;
  if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
  const rightLimit = window.innerWidth - VIEWPORT_MARGIN - maxWidth;
  if (left > rightLimit) left = Math.max(VIEWPORT_MARGIN, rightLimit);

  let top = rect.bottom + GAP;
  if (top + popoverHeight > window.innerHeight - VIEWPORT_MARGIN) {
    top = rect.top - GAP - popoverHeight;
  }
  if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;

  return { top, left, maxWidth };
}

export function HelpHint({ content, label }: HelpHintProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);

  const positionPopover = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const height = popoverRef.current?.offsetHeight ?? 160;
    setPlacement(placementForTrigger(trigger.getBoundingClientRect(), height));
  }, []);

  const show = useCallback(() => {
    const trigger = triggerRef.current;
    if (trigger) {
      setPlacement(placementForTrigger(trigger.getBoundingClientRect()));
    }
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setPlacement(null);
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    positionPopover();
    const frame = requestAnimationFrame(() => positionPopover());
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [visible, content, positionPopover]);

  const popover =
    visible && placement
      ? createPortal(
          <div
            ref={popoverRef}
            className="ui-help-hint-popover"
            role="tooltip"
            style={{
              position: "fixed",
              top: placement.top,
              left: placement.left,
              maxWidth: placement.maxWidth,
              zIndex: 200,
            }}
          >
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        className="ui-help-hint"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <button
          ref={triggerRef}
          type="button"
          className="ui-help-hint-trigger"
          aria-label={label}
          onFocus={show}
          onBlur={hide}
        >
          ?
        </button>
      </span>
      {popover}
    </>
  );
}