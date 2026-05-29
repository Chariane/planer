import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';

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
  const acceptedInvitationType = searchParams.get('accepted');

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
      <GlassCard className="p-8 w-full border-theme-border-subtle/30">
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary to-orange-400 flex items-center justify-center font-black text-white text-2xl mx-auto mb-6 shadow-xl shadow-secondary/20"
          >
            KP
          </motion.div>
          <h1 className="text-2xl font-black text-theme-main tracking-tight uppercase">Double Sécurité</h1>
          <p className="text-theme-muted text-sm mt-2 opacity-60">Entrez le code Google Authenticator</p>
        </div>

        <form onSubmit={handle2FASubmit} className="space-y-6">
          {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-bold">
              {error}
            </motion.div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Code 2FA</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-secondary transition-colors">
                <Shield size={20} />
              </div>
              <input
                type="text"
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-theme-surface/50 border border-white/10 rounded-2xl text-theme-main focus:ring-2 focus:ring-secondary/20 outline-none font-bold tracking-[0.5em] text-center"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
          </div>
          <Button type="submit" loading={isLoading} className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-secondary/20">
            Vérifier & Continuer
          </Button>
        </form>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-10 w-full border-theme-border-subtle/30">
      <div className="text-center mb-10">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary to-orange-400 flex items-center justify-center font-black text-white text-2xl mx-auto mb-6 shadow-xl shadow-secondary/20"
        >
          KP
        </motion.div>
        <h1 className="text-3xl font-black text-theme-main tracking-tighter uppercase mb-2">Bon Retour</h1>
        <p className="text-theme-muted text-sm font-medium opacity-60">Poursuivez vos projets sur K‑Planner</p>

        <AnimatePresence>
          {(acceptedInvitationType || invitationToken) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-6 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl"
            >
              {acceptedInvitationType
                ? "Invitation acceptée ! Connectez-vous maintenant."
                : "Invitation active détectée. Connectez-vous."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 p-4 rounded-xl text-sm font-bold">
            {error}
          </motion.div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Identifiant</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-secondary transition-colors">
              <Mail size={18} />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30 outline-none font-bold transition-all"
              placeholder="Email ou username"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Mot de passe</label>
            <Link to="/forgot-password" className="text-[10px] font-black text-secondary uppercase tracking-widest hover:underline">Oublié ?</Link>
          </div>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-secondary transition-colors">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30 outline-none font-bold transition-all"
              placeholder="••••••••"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-main transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button type="submit" loading={isLoading} className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-secondary/20 group">
          <span className="flex items-center justify-center gap-2">
            Entrer dans l'espace <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </Button>
      </form>

      <div className="mt-10 pt-8 border-t border-theme-border-subtle/30 text-center">
        <p className="text-xs font-medium text-theme-muted">
          Pas encore membre ?{' '}
          <Link to="/register" className="text-secondary font-black uppercase tracking-widest ml-1 hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </GlassCard>
  );
}
