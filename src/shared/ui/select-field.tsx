import type { ReactNode, SelectHTMLAttributes } from "react";

import { cx } from "./utils";

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}

export function SelectField({
  className,
  label,
  hint,
  id,
  children,
  ...props
}: SelectFieldProps) {
  const selectId = id ?? `select-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="ui-select-field">
      <div className="ui-field-label-row">
        <label className="ui-select-label" htmlFor={selectId}>
          {label}
        </label>
        {hint}
      </div>
      <select {...props} id={selectId} className={cx("ui-select", className)}>
        {children}
      </select>
    </div>
  );
}