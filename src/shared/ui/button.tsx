import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "menu";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "default" | "sm";
  children: ReactNode;
}

const VARIANT_CLASSES = {
  primary: "ui-btn--primary",
  secondary: "ui-btn--secondary",
  ghost: "ui-btn--ghost",
  menu: "ui-btn--menu",
};

const SIZE_CLASSES = {
  default: "ui-btn--default",
  sm: "ui-btn--sm",
};

export function Button({
  variant = "ghost",
  size = "default",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "ui-btn",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}