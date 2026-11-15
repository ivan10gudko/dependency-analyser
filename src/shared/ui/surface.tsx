import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./utils";

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "sidebar" | "muted";
  bordered?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES = {
  default: "ui-surface--default",
  sidebar: "ui-surface--sidebar",
  muted: "ui-surface--muted",
};

export function Surface({
  variant = "default",
  bordered = false,
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cx(
        "ui-surface",
        VARIANT_CLASSES[variant],
        bordered && "ui-surface--bordered",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}