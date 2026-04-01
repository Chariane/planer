import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTasksByProject } from "@/features/task/model/taskSlice";
import TaskBoard from "@/features/task/components/TaskBoard";
import EmptyState from "@/components/feedback/EmptyState";

export default function TaskBoardPage() {
  const dispatch = useDispatch();
  const currentProject = useSelector((state) => state.project.currentProject);
  const tasks = useSelector((state) => state.task.items);

  useEffect(() => {
    if (currentProject?.id) {
      dispatch(fetchTasksByProject(currentProject.id));
    }
  }, [dispatch, currentProject?.id]);

  if (!currentProject?.id) {
    return <EmptyState message="Sélectionne un projet pour afficher son board de tâches" />;
  }

  return (
    <section>
      <h1>Tableau des tâches</h1>
      <TaskBoard tasks={tasks} />
    </section>
  );
}
