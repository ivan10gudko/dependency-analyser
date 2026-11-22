import { useMemo } from "react";

import { Button, HelpHint, RangeInput, SelectField } from "../../../shared/ui";
import {
  useGraphInteraction,
  type ConnectivityDepth,
  type FocusDisplayMode,
  type NeighborhoodDirection,
} from "../../graph-interaction";
import {
  listPresetActivity,
  manualColorForMask,
  type LocationColorId,
} from "../../location-colors";

import { LocationColorRulesField } from "./location-color-rules-field";
import { ViewSectionHeading } from "./view-section-heading";
import { ZoneColorPicker } from "./zone-color-picker";

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
    moduleIds,
    locationColoringEnabled,
    locationAutoPresetsEnabled,
    locationColorRules,
    disabledLocationPresetIds,
    setLocationColoringEnabled,
    setLocationAutoPresetsEnabled,
    addLocationColorRule,
    setLocationColorRule,
    removeLocationColorRule,
    setLocationPresetEnabled,
  } = useGraphInteraction();

  const disabledPresetSet = useMemo(
    () => new Set(disabledLocationPresetIds),
    [disabledLocationPresetIds],
  );

  function setPresetColor(presetMask: string, defaultColorId: LocationColorId, next: LocationColorId) {
    if (next === defaultColorId) {
      removeLocationColorRule(presetMask);
      return;
    }
    setLocationColorRule({ mask: presetMask, colorId: next });
  }

  const presetActivity = useMemo(
    () => listPresetActivity(moduleIds),
    [moduleIds],
  );

  const sliderValue =
    connectivityDepth === "all" ? SLIDER_MAX : Math.min(SLIDER_MAX, connectivityDepth);

  return (
    <div className="wb-view-panel">
      <ViewSectionHeading
        title="Neighborhood"
        help="Controls which modules stay visible when a file is focused: direction of the walk and how many hops to include."
      />
      <SelectField
        label="Direction"
        hint={
          <HelpHint
            label="Neighborhood direction"
            content={
              <>
                <strong>Dependencies</strong> — modules this file imports, drawn in teal.{" "}
                <strong>Dependents</strong> — modules that import this file, drawn in amber. With{" "}
                <strong>Both</strong>, depth applies separately along imports and along importers
                (no mixing through a neighbor’s opposite edges). A module reached both ways stays
                purple.
              </>
            }
          />
        }
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
      <RangeInput
        label="Neighborhood depth"
        hint={
          <HelpHint
            label="Neighborhood depth"
            content={
              <>
                1 — direct neighbors only. Higher values include more hops along the chosen
                direction(s). <strong>Entire reachable set</strong> is the same walk without a hop
                limit.
              </>
            }
          />
        }
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

      <ViewSectionHeading title="Focus display" />
      <SelectField
        label="Mode"
        hint={
          <HelpHint
            label="Focus display mode"
            content={
              <>
                <strong>Dimmed</strong> keeps the full graph and dims unrelated modules.{" "}
                <strong>Isolated</strong> shows only the focused neighborhood and recalculates
                layout.
              </>
            }
          />
        }
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
      <label className="wb-view-toggle">
        <input
          type="checkbox"
          checked={barrelViewEnabled}
          onChange={(event) => setBarrelViewEnabled(event.target.checked)}
        />
        <span className="wb-view-toggle-label">
          Collapse barrel folders
          <HelpHint
            label="Barrel folders"
            content={
              <>
                The <strong>index</strong> is always shown as a folder oval. Single-click the
                oval to focus (same as picking the index in the explorer; folder contents stay
                collapsed). Double-click or <strong>Alt</strong>+click toggles internal modules.
                The explorer does not expand barrels automatically. Deep imports stay visible
                (future: Problems warning).
              </>
            }
          />
        </span>
      </label>

      <ViewSectionHeading
        title="Location colors"
        help="Tint node borders and fills by path mask. Edges use the color of the dependency target (to)."
      />
      <label className="wb-view-toggle">
        <input
          type="checkbox"
          checked={locationColoringEnabled}
          onChange={(event) => setLocationColoringEnabled(event.target.checked)}
        />
        <span>Color modules by location</span>
      </label>
      <label className="wb-view-toggle">
        <input
          type="checkbox"
          checked={locationAutoPresetsEnabled}
          disabled={!locationColoringEnabled}
          onChange={(event) => setLocationAutoPresetsEnabled(event.target.checked)}
        />
        <span className="wb-view-toggle-label">
          Suggest colors for common folders
          <HelpHint
            label="Suggested folder colors"
            content={
              <>
                Applies FSD-style defaults (<span className="wb-mask-code">features</span>,{" "}
                <span className="wb-mask-code">shared</span>, etc.) when matching files exist in the
                project. Uncheck a folder to skip its color; click a square to override the
                default for this project.
              </>
            }
          />
        </span>
      </label>
      {locationColoringEnabled && locationAutoPresetsEnabled && (
        <ul className="wb-location-preset-list">
          {presetActivity.map(({ preset, active }) => {
            const enabled = active && !disabledPresetSet.has(preset.id);
            const override = manualColorForMask(locationColorRules, preset.mask);
            const effectiveColor = override ?? preset.colorId;
            return (
              <li
                key={preset.id}
                className={`wb-location-preset-row${enabled ? "" : " is-inactive"}`}
              >
                <label className="wb-location-preset-enable">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={!active}
                    aria-label={`Use color for ${preset.label}`}
                    onChange={(event) =>
                      setLocationPresetEnabled(preset.id, event.target.checked)
                    }
                  />
                </label>
                <ZoneColorPicker
                  colorId={effectiveColor}
                  disabled={!enabled}
                  ariaLabel={`Color for ${preset.label}`}
                  onChange={(next) => setPresetColor(preset.mask, preset.colorId, next)}
                />
                <span className="wb-location-preset-label">{preset.label}</span>
                <span className="wb-location-preset-mask">{preset.mask}</span>
              </li>
            );
          })}
        </ul>
      )}
      {locationColoringEnabled && (
        <LocationColorRulesField
          rules={locationColorRules}
          paths={moduleIds}
          onAdd={addLocationColorRule}
          onSetColor={setLocationColorRule}
          onRemove={removeLocationColorRule}
        />
      )}
    </div>
  );
}

function depthLabel(depth: ConnectivityDepth, sliderValue: number): string {
  if (depth === "all") return "All";
  return String(sliderValue);
}