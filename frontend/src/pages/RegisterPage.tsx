// frontend/src/pages/RegisterPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  
  // Support des deux formats de paramètre
  const invitationToken = searchParams.get('invitation_token') || searchParams.get('invitation');

  // Décoder le token JWT pour extraire l'email
  useEffect(() => {
    const decodeToken = async () => {
      if (!invitationToken) return;
      
      setLoadingInvitation(true);
      try {
        // Décoder le token JWT (partie payload)
        const base64Url = invitationToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        
        console.log('📦 Payload du token:', payload);
        
        // Extraire l'email du payload
        if (payload.email) {
          setForm(prev => ({ ...prev, email: payload.email }));
        }
      } catch (err) {
        console.error('Erreur décodage token', err);
      } finally {
        setLoadingInvitation(false);
      }
    };
    
    decodeToken();
  }, [invitationToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();
    const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;

    if (!usernameRegex.test(username)) {
      setError("Le nom d'utilisateur doit contenir 3 à 30 caractères : lettres, chiffres, point, tiret ou underscore uniquement.");
      return;
    }

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    try {
      const registerData = {
        username,
        email,
        password: form.password,
        ...(invitationToken ? { invitation_token: invitationToken } : {}),
      };
      
      console.log('📤 Envoi inscription avec invitation_token:', invitationToken ? 'Oui' : 'Non');
      
      // Inscription (le backend gère l'invitation automatiquement)
      await register(registerData);
      
      // Nettoyer le token stocké
      sessionStorage.removeItem('pendingInvitation');
      
      // Rediriger vers la page de vérification email
      // L'utilisateur devra vérifier son email puis se connecter
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d’inscription');
    }
  };

  if (loadingInvitation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
      <div className="text-center mb-8">
        <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-bold text-white text-xl mx-auto mb-4">KP</div>
        <h1 className="text-2xl font-bold text-gray-800">Inscription</h1>
        <p className="text-gray-500 mt-1">Rejoignez K‑Planner</p>
        {invitationToken && (
          <div className="mt-3 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            🎉 Vous avez été invité(e) à rejoindre un espace de travail !
            <p className="text-xs text-gray-500 mt-1">Votre email a été pré-rempli automatiquement.</p>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              value={form.username} 
              onChange={e => setForm({...form, username: e.target.value})} 
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent" 
              required 
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_.-]+"
              title="3 à 30 caractères : lettres, chiffres, point, tiret ou underscore uniquement"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">3 à 30 caractères, sans espace.</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="email" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})} 
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent ${invitationToken ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
              readOnly={!!invitationToken}
              required 
            />
          </div>
          {invitationToken && (
            <p className="text-xs text-gray-400 mt-1">L'email est pré-rempli d'après votre invitation</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type={showPassword ? 'text' : 'password'} 
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})} 
              className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent" 
              required 
              minLength={8}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Minimum 8 caractères</p>
        </div>
        
        <Button type="submit" loading={isLoading} className="w-full">
          <UserPlus className="h-4 w-4 mr-2" /> S'inscrire
        </Button>
      </form>
      
      <p className="text-center text-sm text-gray-500 mt-6">
        Déjà inscrit ? <Link to="/login" className="text-secondary font-medium">Se connecter</Link>
      </p>
    </motion.div>
  );
}
