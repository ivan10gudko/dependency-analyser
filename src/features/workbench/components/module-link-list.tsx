import { useState } from "react";

import { Button, ListRow, ScrollArea } from "../../../shared/ui";
import type { ModuleLinkItem } from "../../graph-interaction";

const DEFAULT_VISIBLE = 8;

export interface ModuleLinkListProps {
  title: string;
  items: readonly ModuleLinkItem[];
  emptyLabel: string;
  onSelect: (moduleId: string) => void;
}

export function ModuleLinkList({ title, items, emptyLabel, onSelect }: ModuleLinkListProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems =
    expanded || items.length <= DEFAULT_VISIBLE ? items : items.slice(0, DEFAULT_VISIBLE);

  return (
    <section className="wb-inspector-section">
      <h3 className="wb-inspector-heading">
        {title}
        <span className="wb-inspector-count">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="wb-inspector-empty">{emptyLabel}</p>
      ) : (
        <>
          <ScrollArea className="wb-inspector-scroll">
            <ul className="wb-inspector-list">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <ListRow interactive onClick={() => onSelect(item.id)}>
                    <span className="wb-module-link-name">{item.name}</span>
                    <span className="wb-module-link-path">{item.id}</span>
                  </ListRow>
                </li>
              ))}
            </ul>
          </ScrollArea>
          {items.length > DEFAULT_VISIBLE ? (
            <Button
              variant="ghost"
              size="sm"
              className="wb-inspector-toggle"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Show less" : `Show all (${items.length})`}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}