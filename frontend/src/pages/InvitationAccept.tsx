// frontend/src/pages/InvitationAccept.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { sanitizeText } from '../utils/sanitize';
import { workspaceService } from '../services/workspace.service';
import { espaceService } from '../services/espace.service';
import { listeService } from '../services/liste.service';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

export default function InvitationAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationType, setInvitationType] = useState<'workspace' | 'espace' | 'liste' | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const token = searchParams.get('token');
  const status = searchParams.get('status');
  const redirectedType = searchParams.get('type') as 'workspace' | 'espace' | 'liste' | null;

  useEffect(() => {
    const handleInvitation = async () => {
      if (!token) {
        setError('Token d\'invitation manquant');
        setLoading(false);
        return;
      }

      if (authLoading) {
        return;
      }

      console.log('Token reçu:', token);
      console.log('Utilisateur authentifié:', isAuthenticated);

      // Sauvegarder le token pour une utilisation ultérieure (connexion/inscription)
      sessionStorage.setItem('pendingInvitation', token);

      let payload: Record<string, unknown> | null = null;
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        payload = JSON.parse(atob(base64));
      } catch (decodeErr) {
        console.error('Erreur de décodage du token d’invitation', decodeErr);
      }

      const isExistingUserInvitation = Boolean(payload?.sub);
      const performLogoutAndRedirect = () => {
        // Déconnecter l'utilisateur
        logout();
        // Rediriger vers la page de connexion avec le token d'invitation
        navigate(`/login?invitation_token=${encodeURIComponent(token)}`);
      };

      const startAcceptedRedirect = () => {
        let countdown = 5;
        const interval = setInterval(() => {
          countdown--;
          setRedirectCountdown(countdown);
          if (countdown <= 0) {
            clearInterval(interval);
            performLogoutAndRedirect();
          }
        }, 1000);
      };

      const showAccepted = (type: 'workspace' | 'espace' | 'liste') => {
        setInvitationType(type);
        setAcceptSuccess(true);
        setLoading(false);
        sessionStorage.removeItem('pendingInvitation');
        startAcceptedRedirect();
      };

      if (status === 'success' || status === 'already_member') {
        showAccepted(redirectedType || 'liste');
        return;
      }

      if (!isAuthenticated) {
        if (isExistingUserInvitation) {
          console.log('Invitation pour utilisateur existant, redirection vers connexion');
          navigate(`/login?invitation_token=${encodeURIComponent(token)}`);
        } else {
          console.log('Invitation guest, redirection vers inscription');
          navigate(`/register?invitation_token=${encodeURIComponent(token)}`);
        }
        return;
      }

      // Si l'utilisateur est authentifié, on accepte l'invitation puis on le déconnecte et redirige vers la connexion
      setLoading(true);
      const isWorkspaceToken = payload?.type === 'workspace_invitation' || payload?.scope === 'workspace_invitation_accept';
      const isEspaceToken = payload?.type === 'espace_invitation' || payload?.scope === 'espace_invitation_accept';
      const isListeToken = payload?.type === 'liste_invitation' || payload?.scope === 'liste_invitation_accept';

      try {
        if (isWorkspaceToken) {
          console.log('Acceptation workspace via token workspace...');
          const result = await workspaceService.acceptInvitation(token);
          console.log('Invitation workspace acceptée:', result);
          showAccepted('workspace');

        } else if (isEspaceToken) {
          console.log('Acceptation espace via token espace...');
          const result = await espaceService.acceptInvitation(token);
          console.log('Invitation espace acceptée:', result);
          showAccepted('espace');

        } else if (isListeToken) {
          console.log('Acceptation liste via token liste...');
          const result = await listeService.acceptInvitation(token);
          console.log('Invitation liste acceptée:', result);
          showAccepted('liste');

        } else {
          console.log('Type de token inconnu, tentative workspace puis espace...');
          try {
            const result = await workspaceService.acceptInvitation(token);
            console.log('Invitation workspace acceptée:', result);
            showAccepted('workspace');

          } catch (workspaceErr) {
            console.log('Échec workspace, tentative espace...');
            const result = await espaceService.acceptInvitation(token);
            console.log('Invitation espace acceptée:', result);
            showAccepted('espace');
          }
        }
      } catch (inviteErr: any) {
        console.error('Erreur acceptation invitation :', inviteErr);
        setLoading(false);
        if (inviteErr.message?.includes('Token d\'invitation invalide')) {
          setError(sanitizeText('Le lien d\'invitation est invalide ou a expiré.'));
        } else {
          setError(sanitizeText(inviteErr.message || 'Invitation invalide ou expirée'));
        }
      }
    };

    handleInvitation();
  }, [token, status, redirectedType, navigate, isAuthenticated, authLoading, logout]);

  // Affichage du message de succès avec compte à rebours
  if (acceptSuccess) {
    return (
      <div className="min-h-screen bg-theme-page flex items-center justify-center p-4">
        <GlassCard className="p-10 w-full max-w-md border-emerald-500/10 text-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-8 shadow-xl shadow-emerald-500/10">
            <div className="text-4xl">✓</div>
          </div>
          <h2 className="text-3xl font-black text-theme-main tracking-tighter uppercase mb-4">
            Bienvenue !
          </h2>
          <p className="text-theme-muted font-medium mb-6">
            Invitation acceptée avec succès pour{' '}
            <span className="text-theme-main font-bold">
              {sanitizeText(invitationType === 'workspace'
                ? 'le workspace'
                : invitationType === 'liste'
                  ? 'la liste'
                  : 'l\'espace')}
            </span>.
          </p>
          <div className="bg-theme-surface/30 border border-white/5 p-6 rounded-2xl mb-8 space-y-4">
            <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest leading-relaxed">
              Pour des raisons de sécurité,<br />vous allez être déconnecté(e).
            </p>
            <p className="text-[11px] font-black text-secondary uppercase tracking-[0.1em]">
              Redirection dans {redirectCountdown}s...
            </p>
            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="bg-secondary h-full shadow-[0_0_8px_rgba(255,102,0,0.4)]"
                initial={{ width: "100%" }}
                animate={{ width: `${(redirectCountdown / 5) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-page flex items-center justify-center p-4 text-center">
        <GlassCard className="p-10 w-full max-w-md border-white/10">
          <div className="h-16 w-16 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mx-auto mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-secondary border-t-transparent"></div>
          </div>
          <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] animate-pulse">Traitement de l'invitation...</p>
        </GlassCard>
      </div>
    );
  }

  const title = 'Invitation invalide';

  if (error) {
    return (
      <div className="min-h-screen bg-theme-page flex items-center justify-center p-4 text-center">
        <GlassCard className="p-10 w-full max-w-md border-red-500/10">
          <div className="h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-8 shadow-xl shadow-red-500/10">
            <div className="text-4xl">⚠️</div>
          </div>
          <h2 className="text-xl font-black text-red-500 uppercase tracking-tight mb-4">{sanitizeText(title)}</h2>
          <p className="text-theme-muted text-sm font-medium mb-8 leading-relaxed">
            {sanitizeText(error)}.<br />
            {sanitizeText('Demandez à l\'administrateur de vous renvoyer une nouvelle invitation.')}
          </p>
          <Button onClick={() => navigate('/dashboard')} className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-[11px]">
            Retour au tableau de bord
          </Button>
        </GlassCard>
      </div>
    );
  }

  // Ce return ne devrait pas être atteint normalement
  return null;
}
