import type { InputHTMLAttributes, ReactNode } from "react";

import { cx } from "./utils";

export interface RangeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  valueLabel?: string;
  hint?: ReactNode;
}

export function RangeInput({
  className,
  label,
  valueLabel,
  hint,
  id,
  ...props
}: RangeInputProps) {
  const inputId = id ?? (label ? `range-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);

  return (
    <div className="ui-range-field">
      {(label || valueLabel) && (
        <div className="ui-range-header">
          {label ? (
            <div className="ui-field-label-row">
              <label className="ui-range-label" htmlFor={inputId}>
                {label}
              </label>
              {hint}
            </div>
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