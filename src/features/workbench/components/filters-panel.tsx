import { Button, EmptyState, Surface } from "../../../shared/ui";

export function FiltersPanel() {
  return (
    <div className="wb-filters">
      <EmptyState
        title="Filters"
        description="Graph clustering and filtering controls will appear here."
      />
      <Surface bordered className="wb-filters-section">
        <p className="ui-section-title">Clustering</p>
        <Button disabled className="wb-filters-action">
          Coming soon
        </Button>
      </Surface>
      <Surface bordered className="wb-filters-section">
        <p className="ui-section-title">Subgraph</p>
        <Button disabled className="wb-filters-action">
          Coming soon
        </Button>
      </Surface>
    </div>
  );
}