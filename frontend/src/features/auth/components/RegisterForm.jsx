import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/utils/validation/schemas";
import { clearAuthFeedback, register as registerThunk } from "@/features/auth/model/authSlice";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import useToast from "@/hooks/useToast";

export default function RegisterForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { registerStatus } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    dispatch(clearAuthFeedback());
  }, [dispatch]);

  const onSubmit = async (values) => {
    const payload = {
      full_name: values.full_name,
      email: values.email,
      password: values.password,
    };

    try {
      const data = await dispatch(registerThunk(payload)).unwrap();

      if (data?.access_token && data?.user) {
        toast.success("Inscription réussie, bienvenue dans K-Planer.");
        navigate("/", { replace: true });
        return;
      }

      toast.success("Compte créé avec succès. Connecte-toi pour continuer.");
      navigate("/login", { replace: true });
    } catch (error) {
      // Global interceptor + auth state already handle error feedback.
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
      <Input label="Nom complet" placeholder="Ex: John Doe" error={errors.full_name?.message} {...register("full_name")} />
      <Input label="Email" type="email" placeholder="email@kplaner.com" error={errors.email?.message} {...register("email")} />
      <Input label="Mot de passe" type="password" placeholder="********" error={errors.password?.message} {...register("password")} />
      <Input
        label="Confirmer le mot de passe"
        type="password"
        placeholder="********"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" disabled={isSubmitting || registerStatus === "loading"}>
        {isSubmitting || registerStatus === "loading" ? "Création..." : "Créer mon compte"}
      </Button>

      <p className="auth-helper">
        Déjà inscrit ? <Link to="/login">Se connecter</Link>
      </p>
    </form>
  );
}
