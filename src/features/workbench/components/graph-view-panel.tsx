import { Button, RangeInput, SelectField } from "../../../shared/ui";
import {
  useGraphInteraction,
  type ConnectivityDepth,
  type FocusDisplayMode,
  type NeighborhoodDirection,
} from "../../graph-interaction";

const SLIDER_MAX = 5;

const DISPLAY_MODE_OPTIONS: { value: FocusDisplayMode; label: string }[] = [
  { value: "dimmed", label: "Dimmed" },
  { value: "isolated", label: "Isolated" },
];

const DIRECTION_OPTIONS: { value: NeighborhoodDirection; label: string }[] = [
  { value: "both", label: "Dependencies and dependents" },
  { value: "dependencies", label: "Dependencies only" },
  { value: "dependents", label: "Dependents only" },
];

export function GraphViewPanel() {
  const {
    focusedModuleId,
    connectivityDepth,
    neighborhoodDirection,
    focusDisplayMode,
    barrelViewEnabled,
    setConnectivityDepth,
    setNeighborhoodDirection,
    setFocusDisplayMode,
    setBarrelViewEnabled,
    clearFocus,
  } = useGraphInteraction();

  const sliderValue =
    connectivityDepth === "all" ? SLIDER_MAX : Math.min(SLIDER_MAX, connectivityDepth);

  return (
    <div className="wb-view-panel">
      <p className="wb-view-intro">
        Focus mode highlights or isolates the neighborhood around the selected file.
      </p>
      <SelectField
        label="Focus display"
        value={focusDisplayMode}
        onChange={(event) =>
          setFocusDisplayMode(event.target.value as FocusDisplayMode)
        }
      >
        {DISPLAY_MODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <p className="wb-view-hint">
        <strong>Dimmed</strong> keeps the full graph and dims unrelated modules.{" "}
        <strong>Isolated</strong> shows only the focused neighborhood and recalculates layout.
      </p>
      <label className="wb-view-toggle">
        <input
          type="checkbox"
          checked={barrelViewEnabled}
          onChange={(event) => setBarrelViewEnabled(event.target.checked)}
        />
        <span>Collapse barrel folders</span>
      </label>
      <p className="wb-view-hint">
        The <strong>index</strong> is always shown as a folder oval. Click the oval to focus (same as
        selecting index in the explorer); double-click toggles internal modules. Deep imports stay
        visible (future: Problems warning).
      </p>
      <p className="wb-view-section">Neighborhood</p>
      <SelectField
        label="Direction"
        value={neighborhoodDirection}
        onChange={(event) =>
          setNeighborhoodDirection(event.target.value as NeighborhoodDirection)
        }
      >
        {DIRECTION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <p className="wb-view-hint">
        <strong>Dependencies</strong> — modules this file imports.{" "}
        <strong>Dependents</strong> — modules that import this file.{" "}
        With Both, depth applies separately along imports and along importers (no
        mixing through a neighbor’s opposite edges). All is the same walk without a hop limit.
      </p>
      <RangeInput
        label="Neighborhood depth"
        min={1}
        max={SLIDER_MAX}
        step={1}
        value={sliderValue}
        valueLabel={depthLabel(connectivityDepth, sliderValue)}
        onChange={(event) => {
          const next = Number(event.target.value);
          setConnectivityDepth(next);
        }}
      />
      <p className="wb-view-hint">
        1 — direct neighbors only. Higher values include more hops along the chosen direction(s).
      </p>
      <Button
        variant={connectivityDepth === "all" ? "primary" : "ghost"}
        size="sm"
        onClick={() => setConnectivityDepth("all")}
      >
        Entire reachable set
      </Button>
      {focusedModuleId !== null && (
        <Button variant="ghost" size="sm" onClick={() => clearFocus()}>
          Reset focus
        </Button>
      )}
    </div>
  );
}

function depthLabel(depth: ConnectivityDepth, sliderValue: number): string {
  if (depth === "all") return "All";
  return String(sliderValue);
}