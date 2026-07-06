// frontend/src/pages/LoginPage.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Shield, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { toast } from '../components/ui/Toast';
import { sanitizeApiErrorMessage } from '../services/api'; // ✅ Import

export default function LoginPage() {
  const { login, verify2FA, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const invitationToken = searchParams.get('invitation_token') || sessionStorage.getItem('pendingInvitation');
  const acceptedInvitationType = searchParams.get('accepted');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const message = sanitizeApiErrorMessage(err, 'Erreur de connexion');
      if (message.includes('email n\'est pas encore verifiee')) {
        const emailMatch = identifier.match(/[^@]+@[^@]+\.[^@]+/);
        const emailToUse = emailMatch ? emailMatch[0] : identifier;
        toast.info('Veuillez vérifier votre adresse email avant de vous connecter.');
        navigate(`/verify-email?email=${encodeURIComponent(emailToUse)}`);
      } else {
        toast.error(message);
      }
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verify2FA(challengeToken, twoFactorCode);
      if (invitationToken) {
        navigate(`/invitation/accept?token=${encodeURIComponent(invitationToken)}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(sanitizeApiErrorMessage(err, 'Code 2FA invalide'));
    }
  };

  if (requires2fa) {
    return (
      <GlassCard className="p-10 w-full border-theme-border-subtle/30 shadow-2xl shadow-secondary/5 backdrop-blur-sm bg-theme-surface/60">
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="h-20 w-20 rounded-3xl bg-transparent flex items-center justify-center shadow-2xl shadow-secondary/30 mx-auto mb-6 overflow-hidden border-2 border-white/20"
          >
            <img src="/logo.png" alt="K-Planer" className="h-14 w-14 object-contain" />
          </motion.div>
          <h1 className="text-3xl font-black text-theme-main tracking-tight uppercase">Vérification 2FA</h1>
          <p className="text-theme-muted text-sm mt-2 opacity-70">Entrez le code de votre application d'authentification</p>
        </div>

        <form onSubmit={handle2FASubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Code à 6 chiffres</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-secondary transition-colors">
                <Shield size={20} />
              </div>
              <input
                type="text"
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 pr-4 py-4 bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30 outline-none font-bold tracking-[0.5em] text-center text-xl transition-all"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
          </div>
          <Button type="submit" loading={isLoading} className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-secondary/20 hover:shadow-secondary/40 transition-shadow">
            Vérifier & Continuer
          </Button>
        </form>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-10 w-full border-theme-border-subtle/30 shadow-2xl shadow-secondary/5 backdrop-blur-sm bg-theme-surface/60 relative overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="text-center mb-10 relative">
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="h-20 w-20 rounded-3xl bg-transparent flex items-center justify-center shadow-2xl shadow-secondary/30 mx-auto mb-6 overflow-hidden border-2 border-white/20"
        >
          <img src="/logo.png" alt="K-Planer" className="h-14 w-14 object-contain" />
        </motion.div>
        <h1 className="text-3xl font-black text-theme-main tracking-tight uppercase">Bon Retour</h1>
        <p className="text-theme-muted text-sm mt-2 opacity-70">Poursuivez vos projets sur K‑Planer</p>

        <AnimatePresence>
          {(acceptedInvitationType || invitationToken) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-6 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-2 justify-center"
            >
              <Sparkles size={14} />
              {acceptedInvitationType
                ? "Invitation acceptée ! Connectez-vous maintenant."
                : "Invitation active détectée. Connectez-vous."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 flex items-center gap-2">
            <Mail size={14} className="text-secondary/60" /> Identifiant
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-secondary transition-colors">
              <Mail size={18} />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30 outline-none font-bold transition-all placeholder:font-medium"
              placeholder="Email ou username"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest flex items-center gap-2">
              <Lock size={14} className="text-secondary/60" /> Mot de passe
            </label>
            <Link to="/forgot-password" className="text-[10px] font-black text-secondary/80 hover:text-secondary uppercase tracking-widest transition-colors hover:underline">Oublié ?</Link>
          </div>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-secondary transition-colors">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30 outline-none font-bold transition-all placeholder:font-medium"
              placeholder="••••••••"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-main transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button type="submit" loading={isLoading} className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-secondary/20 hover:shadow-secondary/40 transition-shadow group">
          <span className="flex items-center justify-center gap-2">
            Entrer dans l'espace <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </Button>
      </form>

      <div className="mt-10 pt-8 border-t border-theme-border-subtle/30 text-center relative">
        <p className="text-xs font-medium text-theme-muted">
          Pas encore membre ?{' '}
          <Link to="/register" className="text-secondary font-black uppercase tracking-widest ml-1 hover:underline hover:text-secondary/80 transition-colors">
            Créer un compte
          </Link>
        </p>
      </div>
    </GlassCard>
  );
}