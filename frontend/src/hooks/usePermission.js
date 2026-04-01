import { useSelector } from "react-redux";

export default function usePermission(requiredRoles = []) {
  const roles = useSelector((state) => state.auth.roles);

  if (requiredRoles.length === 0) {
    return true;
  }

  return requiredRoles.some((role) => roles.includes(role));
}
