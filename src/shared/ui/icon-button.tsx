import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "./utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  className,
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx("ui-icon-btn", className)}
      {...props}
    >
      {children}
    </button>
  );
}