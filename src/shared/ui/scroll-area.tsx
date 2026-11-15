import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./utils";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  return (
    <div className={cx("ui-scroll", className)} {...props}>
      {children}
    </div>
  );
}