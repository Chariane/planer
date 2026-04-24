// frontend/src/pages/InvitationAccept.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { workspaceService } from '../services/workspace.service';
import { espaceService } from '../services/espace.service';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

export default function InvitationAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationType, setInvitationType] = useState<'workspace' | 'espace' | null>(null);
  const token = searchParams.get('token');

  useEffect(() => {
    const handleInvitation = async () => {
      if (!token) {
        setError('Token d\'invitation manquant');
        setLoading(false);
        return;
      }

      console.log('🔑 Token reçu:', token);
      console.log('🔐 Utilisateur authentifié:', isAuthenticated);

      // Sauvegarder le token pour une utilisation ultérieure (inscription)
      sessionStorage.setItem('pendingInvitation', token);

      // Si l'utilisateur n'est pas connecté, rediriger vers l'inscription
      if (!isAuthenticated) {
        console.log('🔄 Utilisateur non connecté, redirection vers inscription');
        navigate(`/register?invitation_token=${encodeURIComponent(token)}`);
        return;
      }

      // Si connecté, accepter l'invitation
      setLoading(true);
      try {
        // Essayer d'abord avec workspace
        console.log('📤 Tentative d\'acceptation workspace...');
        const result = await workspaceService.acceptInvitation(token);
        console.log('✅ Invitation workspace acceptée:', result);
        setInvitationType('workspace');
        sessionStorage.removeItem('pendingInvitation');
        
        // Redirection vers le workspace
        const workspaceId = result.membre?.id_workspace || result.workspace_id || result.id_workspace;
        if (workspaceId) {
          navigate(`/workspace/${workspaceId}`);
        } else {
          navigate('/dashboard');
        }
      } catch (workspaceErr) {
        console.log('❌ Échec workspace, tentative espace...');
        try {
          const result = await espaceService.acceptInvitation(token);
          console.log('✅ Invitation espace acceptée:', result);
          setInvitationType('espace');
          sessionStorage.removeItem('pendingInvitation');
          
          // Redirection vers l'espace
          const workspaceId = result.membre?.id_workspace || result.workspace_id;
          const espaceId = result.membre?.id_espace || result.espace_id || result.id_espace;
          if (workspaceId && espaceId) {
            navigate(`/workspace/${workspaceId}/${espaceId}`);
          } else {
            navigate('/dashboard');
          }
        } catch (espaceErr: any) {
          console.error('❌ Échec des deux tentatives:', espaceErr);
          // Message d'erreur plus clair
          if (espaceErr.message?.includes('Token d\'invitation invalide')) {
            setError('Le lien d\'invitation est invalide ou a expiré.');
          } else {
            setError('Invitation invalide ou expirée');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    handleInvitation();
  }, [token, navigate, isAuthenticated]);

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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <GlassCard className="p-8 text-center max-w-md">
        <div className="text-green-500 text-5xl mb-4">✓</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Invitation acceptée !
        </h2>
        <p className="text-gray-600 mb-4">
          Vous avez rejoint avec succès{' '}
          {invitationType === 'workspace' ? 'le workspace' : 'l\'espace'}.
        </p>
        <p className="text-sm text-gray-500">
          Redirection en cours...
        </p>
      </GlassCard>
    </div>
  );
}