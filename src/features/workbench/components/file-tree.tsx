import { useEffect, useMemo, useState } from "react";

import { IconButton, ListRow, ScrollArea } from "../../../shared/ui";
import {
  FileTreeCaret,
  FileTreeFileIcon,
  FileTreeFolderIcon,
} from "../icons/file-tree-icons";
import {
  buildFileTree,
  defaultExpandedFolders,
  folderAncestorIdsForModule,
  type FileTreeNode,
} from "../model/build-file-tree";

export interface FileTreeProps {
  moduleIds: string[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileTree({ moduleIds, selectedPath, onSelectFile }: FileTreeProps) {
  const tree = useMemo(() => buildFileTree(moduleIds), [moduleIds]);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    defaultExpandedFolders(moduleIds),
  );

  const toggleFolder = (folderId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  useEffect(() => {
    if (selectedPath === null) return;

    const ancestors = folderAncestorIdsForModule(selectedPath);
    if (ancestors.length === 0) return;

    setExpanded((current) => {
      const next = new Set(current);
      let changed = false;
      for (const folderId of ancestors) {
        if (!next.has(folderId)) {
          next.add(folderId);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [selectedPath]);

  useEffect(() => {
    if (selectedPath === null) return;

    const frame = requestAnimationFrame(() => {
      const root = document.querySelector(".wb-tree-scroll");
      if (!root) return;
      const row = root.querySelector(`[data-tree-file="${cssEscape(selectedPath)}"]`);
      row?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedPath, expanded]);

  return (
    <ScrollArea className="wb-tree-scroll">
      <div className="wb-tree">{tree.map((node) => renderNode(node, 0))}</div>
    </ScrollArea>
  );

  function renderNode(node: FileTreeNode, depth: number) {
    if (node.kind === "file") {
      return (
        <ListRow
          key={node.id}
          interactive
          selected={selectedPath === node.id}
          className="wb-tree-row"
          data-tree-file={node.id}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          onClick={() => onSelectFile(node.id)}
        >
          <span className="wb-tree-icon">
            <FileTreeFileIcon fileName={node.name} />
          </span>
          <span>{node.name}</span>
        </ListRow>
      );
    }

    const isOpen = expanded.has(node.id);
    return (
      <div key={node.id}>
        <ListRow className="wb-tree-row" style={{ paddingLeft: `${12 + depth * 14}px` }}>
          <IconButton
            label={isOpen ? "Collapse folder" : "Expand folder"}
            onClick={() => toggleFolder(node.id)}
          >
            <FileTreeCaret open={isOpen} />
          </IconButton>
          <span className="wb-tree-icon">
            <FileTreeFolderIcon open={isOpen} />
          </span>
          <span>{node.name}</span>
        </ListRow>
        {isOpen &&
          (node.children ?? []).map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}