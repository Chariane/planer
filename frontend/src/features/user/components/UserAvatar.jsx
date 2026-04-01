export default function UserAvatar({ user }) {
  const initials = user?.full_name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <div className="avatar">{initials || "U"}</div>;
}
