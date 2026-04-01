import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers } from "@/features/user/model/userSlice";
import UserAvatar from "@/features/user/components/UserAvatar";

export default function UserManagementPage() {
  const dispatch = useDispatch();
  const users = useSelector((state) => state.user.items);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  return (
    <section>
      <h1>Gestion des utilisateurs</h1>
      <ul className="list-users">
        {users.map((user) => (
          <li key={user.id}>
            <UserAvatar user={user} />
            <span>{user.full_name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
