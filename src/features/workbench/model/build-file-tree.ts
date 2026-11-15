export type FileTreeNodeKind = "folder" | "file";

export interface FileTreeNode {
  id: string;
  name: string;
  kind: FileTreeNodeKind;
  children?: FileTreeNode[];
}

export function buildFileTree(moduleIds: readonly string[]): FileTreeNode[] {
  const root: FileTreeNode = {
    id: "",
    name: "",
    kind: "folder",
    children: [],
  };

  for (const moduleId of moduleIds) {
    insertPath(root, moduleId.split("/").filter(Boolean));
  }

  return sortChildren(root.children ?? []);
}

function insertPath(folder: FileTreeNode, segments: string[]): void {
  if (segments.length === 0) return;

  folder.children ??= [];
  const [head, ...rest] = segments;
  const isFile = rest.length === 0;

  let child = folder.children.find((node) => node.name === head);
  if (!child) {
    const id = folder.id ? `${folder.id}/${head}` : head;
    child = {
      id,
      name: head,
      kind: isFile ? "file" : "folder",
      children: isFile ? undefined : [],
    };
    folder.children.push(child);
  }

  if (!isFile) {
    insertPath(child, rest);
  }
}

function sortChildren(nodes: FileTreeNode[]): FileTreeNode[] {
  const sorted = [...nodes].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "folder" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });

  for (const node of sorted) {
    if (node.children) {
      node.children = sortChildren(node.children);
    }
  }

  return sorted;
}

export function defaultExpandedFolders(moduleIds: readonly string[]): Set<string> {
  const expanded = new Set<string>();
  if (moduleIds.some((id) => id === "src" || id.startsWith("src/"))) {
    expanded.add("src");
  }
  return expanded;
}

// Folder node ids that must be open for `modulePath` to appear in the tree
export function folderAncestorIdsForModule(modulePath: string): string[] {
  const segments = modulePath.split("/").filter(Boolean);
  if (segments.length <= 1) return [];

  const folders: string[] = [];
  for (let i = 1; i < segments.length; i++) {
    folders.push(segments.slice(0, i).join("/"));
  }
  return folders;
}