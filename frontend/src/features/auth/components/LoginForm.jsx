import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { loginSchema } from "@/utils/validation/schemas";
import { login } from "@/features/auth/model/authSlice";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginForm() {
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    try {
      await dispatch(login(values)).unwrap();
    } catch (error) {
      // Error feedback is handled by the global interceptor + auth state.
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
      <Input label="Email" type="email" placeholder="email@kplaner.com" error={errors.email?.message} {...register("email")} />
      <Input label="Mot de passe" type="password" placeholder="********" error={errors.password?.message} {...register("password")} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Connexion..." : "Se connecter"}
      </Button>

      <p className="auth-helper">
        Pas encore de compte ? <Link to="/register">Créer un compte</Link>
      </p>
    </form>
  );
}
