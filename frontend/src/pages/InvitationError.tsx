// frontend/src/pages/InvitationError.tsx
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

export default function InvitationError() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get('reason');

  let message = "Le lien d'invitation est invalide ou a expiré.";
  if (reason === 'invalid_token') {
    message = "Le lien d'invitation est invalide ou a expiré.";
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <GlassCard className="p-8 text-center max-w-md">
        <div className="text-red-500 text-5xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-red-600 mb-2">Lien invalide</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <p className="text-sm text-gray-500 mb-4">
          Demandez à l'administrateur de vous renvoyer une nouvelle invitation.
        </p>
        <Button onClick={() => navigate('/')}>
          Retour à l'accueil
        </Button>
      </GlassCard>
    </div>
  );
}