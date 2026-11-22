import { isTauri } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import { Button } from "../../../shared/ui";
import { fileNameOf, joinPath } from "../../../lib/path";
import type { ModuleFileStats } from "../../project/module-file-stats";
import type { ModuleId } from "../../project/types";

export interface FileMetadataSectionProps {
  moduleId: ModuleId;
  stats: ModuleFileStats | undefined;
  projectRootAbsolute: string | null;
  dependencyCount: number;
  dependentCount: number;
  fanOutThreshold: number;
  fanInThreshold: number;
}

export function FileMetadataSection({
  moduleId,
  stats,
  projectRootAbsolute,
  dependencyCount,
  dependentCount,
  fanOutThreshold,
  fanInThreshold,
}: FileMetadataSectionProps) {
  const canReveal = isTauri() && projectRootAbsolute != null;

  return (
    <section className="wb-inspector-section wb-file-metadata">
      <h3 className="wb-inspector-heading">Metadata</h3>
      <dl className="wb-metadata-grid">
        <MetaRow label="Name" value={fileNameOf(moduleId)} mono={false} />
        <MetaRow label="Path" value={moduleId} mono />
        <MetaRow label="Type" value={stats?.extension || extensionOf(moduleId) || "—"} />
        <MetaRow label="Size" value={formatBytes(stats?.sizeBytes)} />
        <MetaRow label="Lines" value={stats ? String(stats.lineCount) : "—"} />
        <MetaRow label="Fan-out" value={metricValue(dependencyCount, fanOutThreshold)} />
        <MetaRow label="Fan-in" value={metricValue(dependentCount, fanInThreshold)} />
      </dl>
      <Button
        variant="primary"
        size="sm"
        disabled={!canReveal}
        onClick={() => void revealInFolder(projectRootAbsolute!, moduleId)}
      >
        Reveal in folder
      </Button>
    </section>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? "wb-metadata-mono" : undefined}>{value}</dd>
    </>
  );
}

function metricValue(count: number, threshold: number): string {
  if (count > threshold) return `${count} (over ${threshold})`;
  return String(count);
}

function formatBytes(sizeBytes: number | undefined): string {
  if (sizeBytes === undefined) return "—";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function extensionOf(moduleId: string): string {
  const dot = moduleId.lastIndexOf(".");
  return dot === -1 ? "" : moduleId.slice(dot);
}

async function revealInFolder(projectRoot: string, moduleId: ModuleId): Promise<void> {
  const absolute = joinPath(projectRoot, moduleId);
  await revealItemInDir(absolute);
}