import { useMemo } from "react";

import { useGraphInteraction } from "../../graph-interaction";
import { collectDirectories } from "../../graph-filters";

import { MaskField } from "./mask-field";

export function FiltersPanel() {
  const {
    showTestFiles,
    folderMasks,
    fileMasks,
    moduleIds,
    setShowTestFiles,
    addFolderMasks,
    removeFolderMask,
    addFileMasks,
    removeFileMask,
  } = useGraphInteraction();
  const directories = useMemo(() => collectDirectories(moduleIds), [moduleIds]);

  return (
    <div className="wb-filters">
      <p className="wb-view-intro">
        Hide modules from the graph. The file tree and problem list stay unchanged.
      </p>
      <label className="wb-view-toggle">
        <input
          type="checkbox"
          checked={showTestFiles}
          onChange={(event) => setShowTestFiles(event.target.checked)}
        />
        <span>Show test files</span>
      </label>
      <p className="wb-view-hint">
        When off, files whose names contain <span className="wb-mask-code">.test.ts</span> or{" "}
        <span className="wb-mask-code">.test.js</span> are hidden, including{" "}
        <span className="wb-mask-code">.test.tsx</span> and{" "}
        <span className="wb-mask-code">.test.jsx</span>.
      </p>
      <MaskField
        label="Hidden folders"
        hint="A folder mask hides that folder and everything inside it. * is one path segment, ** is any depth."
        placeholder="Folder mask or path"
        masks={folderMasks}
        paths={directories}
        onAdd={addFolderMasks}
        onRemove={removeFolderMask}
      />
      <MaskField
        label="Hidden files"
        hint="A file mask hides matching module paths. An exact path hides that one file."
        placeholder="File mask or path"
        masks={fileMasks}
        paths={moduleIds}
        onAdd={addFileMasks}
        onRemove={removeFileMask}
      />
    </div>
  );
}
