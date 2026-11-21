import { Button, RangeInput, SelectField } from "../../../shared/ui";
import {
  useGraphInteraction,
  type ConnectivityDepth,
  type NeighborhoodDirection,
} from "../../graph-interaction";

const SLIDER_MAX = 5;

const DIRECTION_OPTIONS: { value: NeighborhoodDirection; label: string }[] = [
  { value: "both", label: "Dependencies and dependents" },
  { value: "dependencies", label: "Dependencies only" },
  { value: "dependents", label: "Dependents only" },
];

export function GraphViewPanel() {
  const {
    connectivityDepth,
    neighborhoodDirection,
    barrelViewEnabled,
    setConnectivityDepth,
    setNeighborhoodDirection,
    setBarrelViewEnabled,
  } = useGraphInteraction();
  const sliderValue =
    connectivityDepth === "all" ? SLIDER_MAX : Math.min(SLIDER_MAX, connectivityDepth);

  return (
    <div className="wb-view-panel">
      <p className="wb-view-intro">
        Controls how much of the graph stays highlighted around the focused file.
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
      <SelectField
        label="Highlight traversal"
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
        mixing through a neighbor’s opposite edges). Entire reachable set is the same
        walk without a hop limit.
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
    </div>
  );
}

function depthLabel(depth: ConnectivityDepth, sliderValue: number): string {
  if (depth === "all") return "All";
  return String(sliderValue);
}