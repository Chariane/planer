export default function ErrorState({ message = "Une erreur est survenue" }) {
  return <div className="feedback feedback-error">{message}</div>;
}
