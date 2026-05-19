// frontend/src/pages/InvitationAccept.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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

      console.log('🔑 Token reçu:', token);
      console.log('🔐 Utilisateur authentifié:', isAuthenticated);

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

      // Si l'utilisateur n'est pas connecté, on distingue les deux cas :
      // - utilisateur existant -> connexion
      // - utilisateur non inscrit -> inscription
      if (!isAuthenticated) {
        if (isExistingUserInvitation) {
          console.log('🔄 Invitation pour utilisateur existant, redirection vers connexion');
          navigate(`/login?invitation_token=${encodeURIComponent(token)}`);
        } else {
          console.log('🔄 Invitation guest, redirection vers inscription');
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
          console.log('📤 Acceptation workspace via token workspace...');
          const result = await workspaceService.acceptInvitation(token);
          console.log('✅ Invitation workspace acceptée:', result);
          showAccepted('workspace');
          
        } else if (isEspaceToken) {
          console.log('📤 Acceptation espace via token espace...');
          const result = await espaceService.acceptInvitation(token);
          console.log('✅ Invitation espace acceptée:', result);
          showAccepted('espace');
          
        } else if (isListeToken) {
          console.log('📤 Acceptation liste via token liste...');
          const result = await listeService.acceptInvitation(token);
          console.log('✅ Invitation liste acceptée:', result);
          showAccepted('liste');
          
        } else {
          console.log('❌ Type de token inconnu, tentative workspace puis espace...');
          try {
            const result = await workspaceService.acceptInvitation(token);
            console.log('✅ Invitation workspace acceptée:', result);
            showAccepted('workspace');
            
          } catch (workspaceErr) {
            console.log('❌ Échec workspace, tentative espace...');
            const result = await espaceService.acceptInvitation(token);
            console.log('✅ Invitation espace acceptée:', result);
            showAccepted('espace');
          }
        }
      } catch (inviteErr: any) {
        console.error('❌ Erreur acceptation invitation :', inviteErr);
        setLoading(false);
        if (inviteErr.message?.includes('Token d\'invitation invalide')) {
          setError('Le lien d\'invitation est invalide ou a expiré.');
        } else {
          setError(inviteErr.message || 'Invitation invalide ou expirée');
        }
      }
    };

    handleInvitation();
  }, [token, status, redirectedType, navigate, isAuthenticated, authLoading, logout]);

  // Affichage du message de succès avec compte à rebours
  if (acceptSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Invitation acceptée !
          </h2>
          <p className="text-gray-600 mb-4">
            Vous avez rejoint avec succès{' '}
            {invitationType === 'workspace'
              ? 'le workspace'
              : invitationType === 'liste'
                ? 'la liste'
                : 'l\'espace'}.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Pour des raisons de sécurité, vous allez être déconnecté(e).
          </p>
          <p className="text-sm text-secondary font-medium">
            Redirection vers la page de connexion dans {redirectCountdown} secondes...
          </p>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-secondary h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${(redirectCountdown / 5) * 100}%` }}
            />
          </div>
        </GlassCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <GlassCard className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-gray-600">Traitement de votre invitation...</p>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">Invitation invalide</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">
            Le lien d'invitation a peut-être expiré ou a déjà été utilisé.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Retour au tableau de bord
          </Button>
        </GlassCard>
      </div>
    );
  }

  // Ce return ne devrait pas être atteint normalement
  return null;
}
