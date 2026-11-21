import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";

import { HelpHint } from "../../../shared/ui";
import { searchPaths } from "../../graph-filters";
import {
  DEFAULT_LOCATION_COLOR_ID,
  LOCATION_COLOR_SWATCHES,
  type LocationColorId,
  type LocationColorRule,
} from "../../location-colors";

import { ZoneColorPicker } from "./zone-color-picker";

export interface LocationColorRulesFieldProps {
  rules: readonly LocationColorRule[];
  paths: readonly string[];
  onAdd: (rule: LocationColorRule) => void;
  onSetColor: (rule: LocationColorRule) => void;
  onRemove: (mask: string) => void;
}

export function LocationColorRulesField({
  rules,
  paths,
  onAdd,
  onSetColor,
  onRemove,
}: LocationColorRulesFieldProps) {
  const inputId = useId();
  const [mask, setMask] = useState("");
  const [colorId, setColorId] = useState<LocationColorId>(DEFAULT_LOCATION_COLOR_ID);
  const trimmed = mask.trim();
  const suggestions = useMemo(
    () => searchPaths(paths, trimmed, 8),
    [paths, trimmed],
  );
  const existing = rules.find((rule) => rule.mask === trimmed);
  const canAdd = trimmed.length > 0;

  function commitRule() {
    if (!canAdd) return;
    onAdd({ mask: trimmed, colorId });
    setMask("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRule();
    }
  }

  return (
    <section className="wb-location-rules">
      <div className="wb-field-label-with-hint">
        <label className="wb-mask-label" htmlFor={inputId}>
          Custom rules
        </label>
        <HelpHint
          label="Custom location color rules"
          content="Path mask plus color. First matching rule wins; custom rules override suggested folder colors. Click a color square on an existing rule to change it."
        />
      </div>
      <div className="wb-location-rule-editor">
        <input
          id={inputId}
          className="wb-mask-input"
          value={mask}
          placeholder="Mask, e.g. **/features/**"
          onChange={(event) => setMask(event.target.value)}
          onKeyDown={onKeyDown}
          list={`${inputId}-suggestions`}
        />
        <datalist id={`${inputId}-suggestions`}>
          {suggestions.map((path) => (
            <option key={path} value={path} />
          ))}
        </datalist>
        <div
          className="wb-zone-swatches"
          role="radiogroup"
          aria-label="Rule color"
        >
          {LOCATION_COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              role="radio"
              aria-checked={colorId === swatch.id}
              className={`wb-zone-swatch wb-zone-swatch--${swatch.id}${
                colorId === swatch.id ? " is-selected" : ""
              }`}
              title={swatch.label}
              onClick={() => setColorId(swatch.id)}
            />
          ))}
        </div>
        <button
          type="button"
          className="wb-location-rule-add"
          disabled={!canAdd}
          onClick={commitRule}
        >
          {existing ? "Update rule" : "Add rule"}
        </button>
      </div>
      {rules.length > 0 && (
        <ul className="wb-location-rule-list">
          {rules.map((rule) => (
            <li key={rule.mask} className="wb-location-rule-row">
              <ZoneColorPicker
                colorId={rule.colorId}
                ariaLabel={`Color for ${rule.mask}`}
                onChange={(nextColorId) =>
                  onSetColor({ mask: rule.mask, colorId: nextColorId })
                }
              />
              <span className="wb-location-rule-mask" title={rule.mask}>
                {rule.mask}
              </span>
              <button
                type="button"
                className="wb-mask-chip-remove"
                aria-label={`Remove rule ${rule.mask}`}
                onClick={() => onRemove(rule.mask)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}