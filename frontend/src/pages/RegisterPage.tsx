// frontend/src/pages/RegisterPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, UserPlus, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { toast } from '../components/ui/Toast';
import { sanitizeApiErrorMessage } from '../services/api'; // ✅ Import

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loadingInvitation, setLoadingInvitation] = useState(false);

  const invitationToken = searchParams.get('invitation_token') || searchParams.get('invitation');

  useEffect(() => {
    const decodeToken = async () => {
      if (!invitationToken) return;

      setLoadingInvitation(true);
      try {
        const base64Url = invitationToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));

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

    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();
    const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;

    if (!usernameRegex.test(username)) {
      toast.error("Le nom d'utilisateur doit contenir 3 à 30 caractères : lettres, chiffres, point, tiret ou underscore uniquement.");
      return;
    }

    if (form.password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    try {
      const registerData = {
        username,
        email,
        password: form.password,
        ...(invitationToken ? { invitation_token: invitationToken } : {}),
        is_entreprise: false,
      };

      await register(registerData);
      sessionStorage.removeItem('pendingInvitation');
      toast.success('Inscription réussie ! Un code de vérification vous a été envoyé par email.');
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(sanitizeApiErrorMessage(err, 'Erreur d’inscription'));
    }
  };

  if (loadingInvitation) {
    return (
      <GlassCard className="p-12 text-center border-theme-border-subtle/30 bg-theme-surface/60">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-secondary border-t-transparent mx-auto mb-6"></div>
        <p className="text-theme-main font-bold uppercase tracking-widest text-[10px]">Vérification de l'invitation...</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-10 w-full border-theme-border-subtle/30 shadow-2xl shadow-secondary/5 backdrop-blur-sm bg-theme-surface/60 relative overflow-hidden">
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
        <h1 className="text-3xl font-black text-theme-main tracking-tight uppercase">Rejoindre</h1>
        <p className="text-theme-muted text-sm mt-2 opacity-70">Créez votre compte K‑Planer</p>

        <AnimatePresence>
          {invitationToken && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-6 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-2 justify-center"
            >
              <ShieldCheck size={14} /> Invitation active reconnue
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 relative">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 flex items-center gap-2">
            <User size={14} className="text-secondary/60" /> Nom d'utilisateur
          </label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-muted group-focus-within:text-secondary transition-colors" />
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl pl-12 pr-4 py-4 text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30 outline-none font-bold transition-all placeholder:font-medium"
              placeholder="Ex: nadege_p"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 flex items-center gap-2">
            <Mail size={14} className="text-secondary/60" /> Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-muted group-focus-within:text-secondary transition-colors" />
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={`w-full bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl pl-12 pr-4 py-4 text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30 outline-none font-bold transition-all placeholder:font-medium ${
                invitationToken ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              readOnly={!!invitationToken}
              placeholder="votre@email.com"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1 flex items-center gap-2">
            <Lock size={14} className="text-secondary/60" /> Mot de passe
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-muted group-focus-within:text-secondary transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl pl-12 pr-12 py-4 text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30 outline-none font-bold transition-all placeholder:font-medium"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-main transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" loading={isLoading} className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-secondary/20 hover:shadow-secondary/40 transition-shadow group">
            <span className="flex items-center justify-center gap-2">
              Créer mon compte <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
            </span>
          </Button>
        </div>
      </form>

      <div className="mt-10 pt-8 border-t border-theme-border-subtle/30 text-center relative">
        <p className="text-xs font-medium text-theme-muted">
          Déjà inscrit ?{' '}
          <Link to="/login" className="text-secondary font-black uppercase tracking-widest ml-1 hover:underline hover:text-secondary/80 transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </GlassCard>
  );
}