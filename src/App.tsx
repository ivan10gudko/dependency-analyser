import "./shared/ui/styles/ui.css";

import { WorkbenchLayout } from "./features/workbench";
import { useProjectWorkspace } from "./features/project/hooks/use-project-workspace";

function App() {
  const workspace = useProjectWorkspace();
  return <WorkbenchLayout workspace={workspace} />;
}

export default App;