import type { ReactNode } from "react";

import { HelpHint } from "../../../shared/ui";

export interface ViewSectionHeadingProps {
  title: string;
  help?: ReactNode;
  helpLabel?: string;
}

export function ViewSectionHeading({ title, help, helpLabel }: ViewSectionHeadingProps) {
  return (
    <div className="wb-view-section-heading">
      <span className="wb-view-section">{title}</span>
      {help ? (
        <HelpHint content={help} label={helpLabel ?? `About ${title}`} />
      ) : null}
    </div>
  );
}