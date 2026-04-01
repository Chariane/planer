import { useDispatch, useSelector } from "react-redux";
import { login, logout } from "@/features/auth/model/authSlice";

export default function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  return {
    ...auth,
    login: (payload) => dispatch(login(payload)),
    logout: () => dispatch(logout()),
  };
}
