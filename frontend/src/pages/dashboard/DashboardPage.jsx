import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkspaces } from "@/features/workspace/model/workspaceSlice";
import WorkspaceSwitcher from "@/features/workspace/components/WorkspaceSwitcher";
import { fetchProjectsByWorkspace } from "@/features/project/model/projectSlice";
import ProjectCard from "@/features/project/components/ProjectCard";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/feedback/ErrorState";
import EmptyState from "@/components/feedback/EmptyState";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const workspaceState = useSelector((state) => state.workspace);
  const projectState = useSelector((state) => state.project);

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  useEffect(() => {
    if (workspaceState.activeWorkspaceId) {
      dispatch(fetchProjectsByWorkspace(workspaceState.activeWorkspaceId));
    }
  }, [dispatch, workspaceState.activeWorkspaceId]);

  if (workspaceState.status === "loading") {
    return <Spinner />;
  }

  if (workspaceState.error) {
    return <ErrorState message={workspaceState.error} />;
  }

  return (
    <section>
      <h1>Dashboard</h1>
      {workspaceState.items.length > 0 && <WorkspaceSwitcher />}

      {projectState.status === "loading" && <Spinner />}
      {projectState.error && <ErrorState message={projectState.error} />}
      {projectState.status === "succeeded" && projectState.items.length === 0 && <EmptyState message="Aucun projet trouvé pour ce workspace" />}

      <div className="grid">
        {projectState.items.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}
