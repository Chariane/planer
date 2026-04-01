import LoginForm from "@/features/auth/components/LoginForm";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ErrorState from "@/components/feedback/ErrorState";
import { clearAuthFeedback } from "@/features/auth/model/authSlice";

export default function LoginPage() {
  const dispatch = useDispatch();
  const authError = useSelector((state) => state.auth.error);

  useEffect(() => {
    dispatch(clearAuthFeedback());
  }, [dispatch]);

  return (
    <section>
      <h2>Connexion</h2>
      <p>Connecte-toi pour accéder à tes workspaces.</p>
      {authError && <ErrorState message={authError} />}
      <LoginForm />
    </section>
  );
}
