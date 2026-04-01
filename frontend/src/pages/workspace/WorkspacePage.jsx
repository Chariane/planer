import { useSelector } from "react-redux";

export default function WorkspacePage() {
  const workspaces = useSelector((state) => state.workspace.items);

  return (
    <section>
      <h1>Workspaces</h1>
      <ul>
        {workspaces.map((workspace) => (
          <li key={workspace.id}>{workspace.name}</li>
        ))}
      </ul>
    </section>
  );
}
