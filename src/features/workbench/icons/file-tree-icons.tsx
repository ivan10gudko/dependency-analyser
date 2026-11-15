import {
  CaretDownIcon,
  CaretRightIcon,
  FileIcon,
  FileJsIcon,
  FileJsxIcon,
  FileTsIcon,
  FileTsxIcon,
  FolderIcon,
  FolderOpenIcon,
  type Icon,
  type IconProps,
} from "@phosphor-icons/react";

const FILE_ICON_SIZE = 16;
const CHEVRON_SIZE = 12;

const fileIconProps: IconProps = {
  size: FILE_ICON_SIZE,
  weight: "duotone",
  color: "var(--color-tree-icon)",
};

export function FileTreeFileIcon({ fileName }: { fileName: string }) {
  const IconComponent = pickFileIcon(fileName);
  return <IconComponent {...fileIconProps} className="wb-tree-phosphor" aria-hidden />;
}

export function FileTreeFolderIcon({ open }: { open: boolean }) {
  const IconComponent = open ? FolderOpenIcon : FolderIcon;
  return <IconComponent {...fileIconProps} className="wb-tree-phosphor" aria-hidden />;
}

export function FileTreeCaret({ open }: { open: boolean }) {
  const IconComponent = open ? CaretDownIcon : CaretRightIcon;
  return (
    <IconComponent
      size={CHEVRON_SIZE}
      weight="bold"
      color="var(--color-fg-muted)"
      className="wb-tree-phosphor wb-tree-phosphor--chevron"
      aria-hidden
    />
  );
}

function pickFileIcon(fileName: string): Icon {
  const dot = fileName.lastIndexOf(".");
  const ext = dot === -1 ? "" : fileName.slice(dot).toLowerCase();

  switch (ext) {
    case ".ts":
      return FileTsIcon;
    case ".tsx":
      return FileTsxIcon;
    case ".js":
      return FileJsIcon;
    case ".jsx":
      return FileJsxIcon;
    default:
      return FileIcon;
  }
}