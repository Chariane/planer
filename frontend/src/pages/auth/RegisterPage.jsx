import { useSelector } from "react-redux";
import ErrorState from "@/components/feedback/ErrorState";
import RegisterForm from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  const authError = useSelector((state) => state.auth.error);

  return (
    <section>
      <h2>Inscription</h2>
      <p>Crée ton compte K-Planer pour gérer tes workspaces et projets.</p>
      {authError && <ErrorState message={authError} />}
      <RegisterForm />
    </section>
  );
}
