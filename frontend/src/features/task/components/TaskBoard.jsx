export default function TaskBoard({ tasks = [] }) {
  const todo = tasks.filter((task) => task.status === "todo");
  const doing = tasks.filter((task) => task.status === "doing");
  const done = tasks.filter((task) => task.status === "done");

  const columns = [
    { key: "A faire", items: todo },
    { key: "En cours", items: doing },
    { key: "Terminé", items: done },
  ];

  return (
    <div className="board">
      {columns.map((column) => (
        <section className="board-column" key={column.key}>
          <h3>{column.key}</h3>
          {column.items.map((task) => (
            <article key={task.id} className="card">
              <h4>{task.title}</h4>
              <p>{task.description || "Pas de description"}</p>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
