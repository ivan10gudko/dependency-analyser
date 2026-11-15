import type { ReactNode, SelectHTMLAttributes } from "react";

import { cx } from "./utils";

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function SelectField({ className, label, id, children, ...props }: SelectFieldProps) {
  const selectId = id ?? `select-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="ui-select-field">
      <label className="ui-select-label" htmlFor={selectId}>
        {label}
      </label>
      <select {...props} id={selectId} className={cx("ui-select", className)}>
        {children}
      </select>
    </div>
  );
}