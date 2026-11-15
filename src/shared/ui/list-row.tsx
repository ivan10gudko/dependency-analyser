import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./utils";

export interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "default" | "warning" | "danger";
  interactive?: boolean;
  selected?: boolean;
  mono?: boolean;
  children: ReactNode;
}

const TONE_CLASSES = {
  default: "ui-list-row--default",
  warning: "ui-list-row--warning",
  danger: "ui-list-row--danger",
};

export function ListRow({
  tone = "default",
  interactive = false,
  selected = false,
  mono = false,
  className,
  children,
  ...props
}: ListRowProps) {
  return (
    <div
      className={cx(
        "ui-list-row",
        interactive && "ui-list-row--interactive",
        selected && "ui-list-row--selected",
        TONE_CLASSES[tone],
        mono && "ui-list-row__mono",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}