import { useMemo, useState } from "react";

import { IconButton, ListRow, ScrollArea } from "../../../shared/ui";
import {
  FileTreeCaret,
  FileTreeFileIcon,
  FileTreeFolderIcon,
} from "../icons/file-tree-icons";
import {
  buildFileTree,
  defaultExpandedFolders,
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