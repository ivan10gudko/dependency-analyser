import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  type ReactNode,
} from "react";

import { cx } from "./utils";

interface TabsContextValue {
  activeId: string;
  setActiveId: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const value = useContext(TabsContext);
  if (!value) throw new Error("Tabs components must be used within Tabs");
  return value;
}

export interface TabsProps {
  activeId: string;
  onActiveIdChange: (id: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ activeId, onActiveIdChange, children, className }: TabsProps) {
  const baseId = useId();
  const setActiveId = useCallback(
    (id: string) => onActiveIdChange(id),
    [onActiveIdChange],
  );
  const value = useMemo(
    () => ({ activeId, setActiveId, baseId }),
    [activeId, setActiveId, baseId],
  );

  return (
    <TabsContext.Provider value={value}>
      <div className={cx("ui-tabs", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children }: { children: ReactNode }) {
  return (
    <div className="ui-tab-list" role="tablist">
      {children}
    </div>
  );
}

export interface TabProps {
  id: string;
  children: ReactNode;
}

export function Tab({ id, children }: TabProps) {
  const { activeId, setActiveId, baseId } = useTabsContext();
  const selected = activeId === id;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${id}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${id}`}
      className={cx("ui-tab", selected && "ui-tab--active")}
      onClick={() => setActiveId(id)}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  id: string;
  children: ReactNode;
}

export function TabPanel({ id, children }: TabPanelProps) {
  const { activeId, baseId } = useTabsContext();
  const selected = activeId === id;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${id}`}
      aria-labelledby={`${baseId}-tab-${id}`}
      className="ui-tab-panel"
      hidden={!selected}
    >
      {children}
    </div>
  );
}