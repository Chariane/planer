import { Link } from "react-router-dom";

export default function ProjectCard({ project }) {
  return (
    <article className="card">
      <h3>{project.name}</h3>
      <p>{project.description || "Aucune description"}</p>
      <Link to={`/projects/${project.id}`}>Voir le projet</Link>
    </article>
  );
}
