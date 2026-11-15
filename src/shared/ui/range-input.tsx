import type { InputHTMLAttributes } from "react";

import { cx } from "./utils";

export interface RangeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  valueLabel?: string;
}

export function RangeInput({ className, label, valueLabel, id, ...props }: RangeInputProps) {
  const inputId = id ?? (label ? `range-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);

  return (
    <div className="ui-range-field">
      {(label || valueLabel) && (
        <div className="ui-range-header">
          {label ? (
            <label className="ui-range-label" htmlFor={inputId}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {valueLabel ? <span className="ui-range-value">{valueLabel}</span> : null}
        </div>
      )}
      <input
        {...props}
        id={inputId}
        type="range"
        className={cx("ui-range-input", className)}
      />
    </div>
  );
}