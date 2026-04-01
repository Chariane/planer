import { useDispatch, useSelector } from "react-redux";
import { setActiveWorkspace } from "@/features/workspace/model/workspaceSlice";

export default function WorkspaceSwitcher() {
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspace.items);
  const activeWorkspaceId = useSelector((state) => state.workspace.activeWorkspaceId);

  if (workspaces.length === 0) {
    return null;
  }

  return (
    <select value={activeWorkspaceId || String(workspaces[0].id)} onChange={(event) => dispatch(setActiveWorkspace(event.target.value))}>
      {workspaces.map((workspace) => (
        <option key={workspace.id} value={String(workspace.id)}>
          {workspace.name}
        </option>
      ))}
    </select>
  );
}
