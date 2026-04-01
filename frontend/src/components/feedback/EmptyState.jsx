export default function EmptyState({ message = "Aucune donnée disponible" }) {
  return <div className="feedback feedback-empty">{message}</div>;
}
