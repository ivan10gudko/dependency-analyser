import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { Surface } from "./surface";
import { cx } from "./utils";

interface MenuBarContextValue {
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

const MenuBarContext = createContext<MenuBarContextValue | null>(null);

export function MenuBar({
  children,
  className,
}: { children: ReactNode } & Pick<HTMLAttributes<HTMLElement>, "className">) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <MenuBarContext.Provider value={{ openId, setOpenId }}>
      <nav className={cx("ui-menubar ui-surface", className)} aria-label="Application menu">
        {children}
      </nav>
    </MenuBarContext.Provider>
  );
}

function useMenuBar(): MenuBarContextValue {
  const ctx = useContext(MenuBarContext);
  if (!ctx) throw new Error("Menu components must be used within MenuBar");
  return ctx;
}

export function Menu({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const { openId, setOpenId } = useMenuBar();
  const rootRef = useRef<HTMLDivElement>(null);
  const open = openId === id;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenId(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, setOpenId]);

  const toggle = useCallback(() => {
    setOpenId(open ? null : id);
  }, [id, open, setOpenId]);

  return (
    <div
      ref={rootRef}
      className={cx("ui-menu-root", open && "ui-menu-root--open")}
      onMouseLeave={() => setOpenId(null)}
    >
      <button type="button" className="ui-menu-trigger" onClick={toggle} aria-expanded={open}>
        {label}
      </button>
      {open && (
        <Surface variant="default" bordered className="ui-menu-dropdown">
          {children}
        </Surface>
      )}
    </div>
  );
}

export interface MenuItemProps {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  checked?: boolean;
}

export function MenuItem({ children, onSelect, disabled, checked }: MenuItemProps) {
  const { setOpenId } = useMenuBar();

  return (
    <button
      type="button"
      className={cx("ui-menu-item", checked && "ui-menu-item--checked")}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        setOpenId(null);
      }}
    >
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="ui-menu-separator" role="separator" />;
}