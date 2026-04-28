import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Eye, EyeOff, Shield } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export default function LoginPage() {
  const { login, verify2FA, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const invitationToken = searchParams.get('invitation_token') || sessionStorage.getItem('pendingInvitation');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await login(identifier, password);
      if (result.requires2fa) {
        setRequires2fa(true);
        setChallengeToken(result.challengeToken!);
      } else {
        if (invitationToken) {
          navigate(`/invitation/accept?token=${encodeURIComponent(invitationToken)}`);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      if (message.includes('email n\'est pas encore verifiee')) {
        // Extraire l'email du message si possible, sinon rediriger avec l'email saisi
        const emailMatch = identifier.match(/[^@]+@[^@]+\.[^@]+/);
        const emailToUse = emailMatch ? emailMatch[0] : identifier;
        navigate(`/verify-email?email=${encodeURIComponent(emailToUse)}`);
      } else {
        setError(message);
      }
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await verify2FA(challengeToken, twoFactorCode);
      if (invitationToken) {
        navigate(`/invitation/accept?token=${encodeURIComponent(invitationToken)}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code 2FA invalide');
    }
  };

  if (requires2fa) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-bold text-white text-xl mx-auto mb-4">KP</div>
          <h1 className="text-2xl font-bold text-gray-800">Authentification à deux facteurs</h1>
          <p className="text-gray-500 mt-1">Entrez le code Google Authenticator</p>
        </div>
        <form onSubmit={handle2FASubmit} className="space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code 2FA</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" value={twoFactorCode} onChange={e => setTwoFactorCode(e.target.value)} className="w-full pl-10 pr-3 py-2 border rounded-lg" placeholder="000000" maxLength={6} required />
            </div>
          </div>
          <Button type="submit" loading={isLoading} className="w-full">Vérifier</Button>
        </form>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-bold text-white text-xl mx-auto mb-4">KP</div>
        <h1 className="text-2xl font-bold text-gray-800">Connexion</h1>
        <p className="text-gray-500 mt-1">Accédez à votre espace de travail</p>
        {invitationToken && (
          <div className="mt-3 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            Invitation détectée : connectez-vous pour finaliser votre adhésion.
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email ou nom d'utilisateur</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-secondary" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2 border rounded-lg" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <Button type="submit" loading={isLoading} className="w-full"><LogIn className="h-4 w-4 mr-2" /> Se connecter</Button>
      </form>
      <div className="mt-4 text-center">
        <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700">Mot de passe oublié ?</Link>
      </div>
      <p className="text-center text-sm text-gray-500 mt-6">Pas encore de compte ? <Link to="/register" className="text-secondary font-medium">Créer un compte</Link></p>
    </motion.div>
  );
}
