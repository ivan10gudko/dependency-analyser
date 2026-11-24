import {
  CaretDownIcon,
  CaretUpIcon,
  DotsSixVerticalIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useId, useMemo, useState, type DragEvent, type KeyboardEvent } from "react";

import { fsdLayerPreset, type ArchitectureLayer } from "../../analysis";
import { searchPaths } from "../../graph-filters";
import { Button, HelpHint, IconButton, Surface } from "../../../shared/ui";

import { ViewSectionHeading } from "./view-section-heading";

const ICON_SIZE = 14;
const DRAG_ICON_SIZE = 16;

export interface LayerRulesFieldProps {
  layers: readonly ArchitectureLayer[];
  paths: readonly string[];
  matchedLayers: readonly string[];
  projectOpen: boolean;
  onChange: (layers: readonly ArchitectureLayer[]) => void;
}

export function LayerRulesField({
  layers,
  paths,
  matchedLayers,
  projectOpen,
  onChange,
}: LayerRulesFieldProps) {
  const nameId = useId();
  const maskId = useId();
  const [name, setName] = useState("");
  const [mask, setMask] = useState("");
  const [sliced, setSliced] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const trimmedName = name.trim();
  const trimmedMask = mask.trim();
  const suggestions = useMemo(
    () => searchPaths(paths, trimmedMask, 8),
    [paths, trimmedMask],
  );
  const nameTaken = layers.some((layer) => layer.name === trimmedName);
  const maskTaken = layers.some((layer) => layer.mask === trimmedMask);
  const canAdd = trimmedName.length > 0 && trimmedMask.length > 0 && !nameTaken && !maskTaken;
  const matched = new Set(matchedLayers);

  function commitLayer() {
    if (!canAdd) return;
    onChange([...layers, { name: trimmedName, mask: trimmedMask, sliced }]);
    setName("");
    setMask("");
    setSliced(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitLayer();
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= layers.length) return;
    onChange(reorderLayers(layers, index, next));
  }

  function finishDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null) return;
    onChange(reorderLayers(layers, dragIndex, targetIndex));
    finishDrag();
  }

  return (
    <section className="wb-layer-rules">
      <ViewSectionHeading
        title="Architecture layers"
        helpLabel="Architecture layer order"
        help={
          <>
            Lowest layer first, highest last. Modules may import only from lower layers. When
            sliced is on, imports inside the same layer must stay within one slice.
          </>
        }
      />
      {layers.length > 0 ? (
        <ol className="wb-layer-stack" aria-label="Layer hierarchy">
          {layers.map((layer, index) => (
            <li key={layer.mask} className="wb-layer-stack-item">
              <Surface
                variant="muted"
                bordered
                className={layerCardClass(
                  index,
                  dragIndex,
                  overIndex,
                  projectOpen && matched.has(layer.name),
                )}
                onDragOver={(event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragIndex !== null && dragIndex !== index) setOverIndex(index);
                }}
                onDragLeave={() => {
                  setOverIndex((current) => (current === index ? null : current));
                }}
                onDrop={(event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  handleDrop(index);
                }}
              >
                <button
                  type="button"
                  className="wb-layer-drag"
                  draggable
                  aria-label={`Drag ${layer.name}`}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                    setDragIndex(index);
                  }}
                  onDragEnd={finishDrag}
                >
                  <DotsSixVerticalIcon size={DRAG_ICON_SIZE} weight="bold" aria-hidden />
                </button>
                <span className="wb-layer-rank" title="Layer rank (lowest first)">
                  {index + 1}
                </span>
                <div className="wb-layer-main">
                  <span className="wb-layer-name">{layer.name}</span>
                  <code className="wb-layer-mask" title={layer.mask}>
                    {layer.mask}
                  </code>
                </div>
                <label className="wb-layer-sliced">
                  <input
                    type="checkbox"
                    checked={layer.sliced}
                    aria-label={`Sliced ${layer.name}`}
                    onChange={(event) =>
                      onChange(
                        layers.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, sliced: event.target.checked } : item,
                        ),
                      )
                    }
                  />
                  Sliced
                </label>
                <div className="wb-layer-actions">
                  <IconButton
                    label={`Move ${layer.name} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <CaretUpIcon size={ICON_SIZE} weight="bold" aria-hidden />
                  </IconButton>
                  <IconButton
                    label={`Move ${layer.name} down`}
                    disabled={index === layers.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <CaretDownIcon size={ICON_SIZE} weight="bold" aria-hidden />
                  </IconButton>
                  <IconButton
                    label={`Remove ${layer.name}`}
                    onClick={() => onChange(layers.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <TrashIcon size={ICON_SIZE} aria-hidden />
                  </IconButton>
                </div>
              </Surface>
            </li>
          ))}
        </ol>
      ) : (
        <Surface variant="muted" bordered className="wb-layer-empty">
          <p>No layers yet. Add one below or apply the FSD preset.</p>
        </Surface>
      )}

      <Surface variant="default" bordered className="wb-layer-editor-card">
        <div className="wb-layer-editor-head">
          <span className="wb-mask-label">New layer</span>
          <HelpHint
            label="New architecture layer"
            content="Name is shown in issue messages. Mask uses the same globs as filters (* and **)."
          />
        </div>
        <div className="wb-layer-editor-grid">
          <input
            id={nameId}
            className="wb-mask-input"
            value={name}
            placeholder="Layer name"
            aria-label="Layer name"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <input
            id={maskId}
            className="wb-mask-input"
            value={mask}
            placeholder="Mask, e.g. **/features/**"
            aria-label="Layer mask"
            onChange={(event) => setMask(event.target.value)}
            onKeyDown={onKeyDown}
            list={`${maskId}-suggestions`}
          />
          <datalist id={`${maskId}-suggestions`}>
            {suggestions.map((path) => (
              <option key={path} value={path} />
            ))}
          </datalist>
          <label className="wb-layer-sliced wb-layer-sliced--editor">
            <input
              type="checkbox"
              checked={sliced}
              onChange={(event) => setSliced(event.target.checked)}
            />
            Sliced
          </label>
        </div>
        <div className="wb-layer-editor-actions">
          <Button type="button" variant="secondary" size="sm" disabled={!canAdd} onClick={commitLayer}>
            Add layer
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(fsdLayerPreset())}
          >
            Apply FSD preset
          </Button>
        </div>
      </Surface>

      <p className="wb-issues-fsd">{statusText(projectOpen, layers.length, matchedLayers)}</p>
    </section>
  );
}

function layerCardClass(
  index: number,
  dragIndex: number | null,
  overIndex: number | null,
  isMatched: boolean,
): string {
  const classes = ["wb-layer-card"];
  if (dragIndex === index) classes.push("is-dragging");
  if (overIndex === index) classes.push("is-drop-target");
  if (isMatched) classes.push("is-matched");
  return classes.join(" ");
}

function reorderLayers(
  layers: readonly ArchitectureLayer[],
  from: number,
  to: number,
): ArchitectureLayer[] {
  if (from === to) return [...layers];
  const copy = [...layers];
  const [item] = copy.splice(from, 1);
  if (!item) return [...layers];
  copy.splice(to, 0, item);
  return copy;
}

function statusText(
  projectOpen: boolean,
  layerCount: number,
  matchedLayers: readonly string[],
): string {
  if (!projectOpen) return "Open a project to analyze dependencies.";
  if (layerCount === 0) return "No architecture layers configured.";
  if (matchedLayers.length === 0) return "No modules matched the layer masks.";
  return `Matched layers: ${matchedLayers.join(", ")}.`;
}