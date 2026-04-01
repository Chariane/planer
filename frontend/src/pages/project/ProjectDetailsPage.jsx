import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProjectDetails } from "@/features/project/model/projectSlice";

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const project = useSelector((state) => state.project.currentProject);

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectDetails(projectId));
    }
  }, [dispatch, projectId]);

  return (
    <section>
      <h1>Détails du projet</h1>
      {project ? (
        <article>
          <h2>{project.name}</h2>
          <p>{project.description}</p>
        </article>
      ) : (
        <p>Chargement des détails...</p>
      )}
    </section>
  );
}
