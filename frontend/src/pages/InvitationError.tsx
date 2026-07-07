// frontend/src/pages/InvitationError.tsx
import { useSearchParams, useNavigate } from 'react-router-dom';
import { sanitizeText } from '../utils/sanitize';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';

export default function InvitationError() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get('reason');

  let message = sanitizeText("Le lien d'invitation est invalide ou a expiré.");
  let title = sanitizeText('Lien invalide');
  if (reason === 'invalid_token') {
    message = sanitizeText("Le lien d'invitation est invalide ou a expiré.");
  } else if (reason) {
    message = sanitizeText(reason);
    title = sanitizeText('Invitation impossible');
  }

  return (
    <div className="min-h-screen bg-theme-page flex items-center justify-center p-4 text-center">
      <GlassCard className="p-10 w-full max-w-md border-red-500/10">
        <div className="h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-8 shadow-xl shadow-red-500/10">
          <div className="text-4xl">❌</div>
        </div>
        <h2 className="text-xl font-black text-red-500 uppercase tracking-tight mb-4">{sanitizeText(title)}</h2>
        <p className="text-theme-muted text-sm font-medium mb-8 leading-relaxed">
          {sanitizeText(message)}.<br />
          {sanitizeText('Demandez à l\'administrateur de vous renvoyer une nouvelle invitation.')}
        </p>
        <Button onClick={() => navigate('/')} className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-[11px]">
          Retour à l'accueil
        </Button>
      </GlassCard>
    </div>
  );
}
