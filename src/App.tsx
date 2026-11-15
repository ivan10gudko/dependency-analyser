import "./shared/ui/styles/ui.css";

import { GraphInteractionProvider } from "./features/graph-interaction";
import { useProjectWorkspace } from "./features/project/hooks/use-project-workspace";
import { WorkbenchLayout } from "./features/workbench";

function App() {
  const workspace = useProjectWorkspace();

  return (
    <GraphInteractionProvider
      dependencyGraph={workspace.dependencyGraph}
      moduleFileStats={workspace.moduleFileStats}
      projectRootAbsolute={workspace.projectRootAbsolute}
      projectKey={workspace.projectRootAbsolute}
    >
      <WorkbenchLayout workspace={workspace} />
    </GraphInteractionProvider>
  );
}

export default App;