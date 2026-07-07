import { sanitizeText } from '../utils/sanitize';

export default function UsersPage() {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-theme-main">
        {sanitizeText('Utilisateurs')}
      </h2>
      <p className="text-gray-500 mt-1">
        {sanitizeText('Page en construction')}
      </p>
    </div>
  );
}
