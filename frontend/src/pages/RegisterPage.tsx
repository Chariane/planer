// frontend/src/pages/RegisterPage.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, UserPlus, Eye, EyeOff, ShieldCheck, Building2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';

type EnterpriseForm = {
  nom: string;
  statut_juridique: string;
  telephone: string;
  adresse: string;
  numero_ifu: string;
  numero_rccm: string;
  nom_responsable_entreprise: string;
  prenoms_responsable_entreprise: string;
  telephone_responsable_entreprise: string;
  site_web: string;
  description: string;
};

const initialEnterpriseForm: EnterpriseForm = {
  nom: '',
  statut_juridique: '',
  telephone: '',
  adresse: '',
  numero_ifu: '',
  numero_rccm: '',
  nom_responsable_entreprise: '',
  prenoms_responsable_entreprise: '',
  telephone_responsable_entreprise: '',
  site_web: '',
  description: '',
};

const compactEnterprisePayload = (data: EnterpriseForm) =>
  Object.fromEntries(
    Object.entries(data)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value)
  );

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [enterpriseForm, setEnterpriseForm] = useState<EnterpriseForm>(initialEnterpriseForm);
  const [accountType, setAccountType] = useState<'personal' | 'enterprise'>('personal');
  const [error, setError] = useState('');
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

    if (accountType === 'enterprise' && !enterpriseForm.nom.trim()) {
      setError("Le nom de l'entreprise est obligatoire pour créer un compte entreprise.");
      return;
    }

    try {
      const entreprise = accountType === 'enterprise' ? compactEnterprisePayload(enterpriseForm) : undefined;
      const registerData = {
        username,
        email,
        password: form.password,
        ...(invitationToken ? { invitation_token: invitationToken } : {}),
        is_entreprise: accountType === 'enterprise',
        ...(entreprise ? { entreprise } : {}),
      };

      await register(registerData);
      sessionStorage.removeItem('pendingInvitation');
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d’inscription');
    }
  };

  if (loadingInvitation) {
    return (
      <GlassCard className="p-12 text-center border-theme-border-subtle/30">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-secondary border-t-transparent mx-auto mb-6"></div>
        <p className="text-theme-main font-bold uppercase tracking-widest text-[10px]">Vérification de l'invitation...</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-10 w-full border-theme-border-subtle/30">
      <div className="text-center mb-10">
        <motion.div
          initial={{ rotate: -10, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          className="h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary to-orange-400 flex items-center justify-center font-black text-white text-2xl mx-auto mb-6 shadow-xl shadow-secondary/20"
        >
          KP
        </motion.div>
        <h1 className="text-3xl font-black text-theme-main tracking-tighter uppercase mb-2">Rejoindre</h1>
        <p className="text-theme-muted text-sm font-medium opacity-60">Créez votre compte K‑Planner</p>

        <AnimatePresence>
          {invitationToken && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-6 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-2 justify-center"
            >
              <ShieldCheck size={14} /> Invitation active reconnue
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setAccountType('personal')}
          className={`rounded-2xl border p-4 text-left transition-all ${accountType === 'personal' ? 'border-secondary bg-secondary/10 text-secondary' : 'border-theme-border-subtle/30 bg-theme-surface/20 text-theme-muted hover:border-secondary/30'}`}
        >
          <User className="mb-3 h-5 w-5" />
          <span className="block text-[10px] font-black uppercase tracking-widest">Compte personnel</span>
          <span className="mt-1 block text-xs font-medium opacity-70">Pour demarrer seul ou avec une petite equipe.</span>
        </button>
        <button
          type="button"
          onClick={() => setAccountType('enterprise')}
          className={`rounded-2xl border p-4 text-left transition-all ${accountType === 'enterprise' ? 'border-secondary bg-secondary/10 text-secondary' : 'border-theme-border-subtle/30 bg-theme-surface/20 text-theme-muted hover:border-secondary/30'}`}
        >
          <Building2 className="mb-3 h-5 w-5" />
          <span className="block text-[10px] font-black uppercase tracking-widest">Compte entreprise</span>
          <span className="mt-1 block text-xs font-medium opacity-70">Pour creer une organisation et gerer un abonnement.</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 p-4 rounded-xl text-xs font-bold leading-relaxed">
            {error}
          </motion.div>
        )}


        <AnimatePresence>
          {accountType === 'enterprise' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-3xl border border-secondary/20 bg-secondary/5 p-5 space-y-4"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Informations entreprise</p>
                <p className="mt-1 text-xs font-medium text-theme-muted opacity-70">
                  Le nom est obligatoire. Les autres informations pourront etre completees plus tard.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Nom de l'entreprise</label>
                  <input
                    type="text"
                    value={enterpriseForm.nom}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, nom: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="Ex: K-Services SARL"
                    required={accountType === 'enterprise'}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Statut juridique</label>
                  <input
                    type="text"
                    value={enterpriseForm.statut_juridique}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, statut_juridique: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="SARL, SA, ONG..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Telephone</label>
                  <input
                    type="tel"
                    value={enterpriseForm.telephone}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, telephone: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="+229..."
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Adresse</label>
                  <input
                    type="text"
                    value={enterpriseForm.adresse}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, adresse: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="Ville, quartier, adresse"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Numero IFU</label>
                  <input
                    type="text"
                    value={enterpriseForm.numero_ifu}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, numero_ifu: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="Optionnel"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Numero RCCM</label>
                  <input
                    type="text"
                    value={enterpriseForm.numero_rccm}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, numero_rccm: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="Optionnel"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Nom du responsable</label>
                  <input
                    type="text"
                    value={enterpriseForm.nom_responsable_entreprise}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, nom_responsable_entreprise: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="Optionnel"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Prenoms du responsable</label>
                  <input
                    type="text"
                    value={enterpriseForm.prenoms_responsable_entreprise}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, prenoms_responsable_entreprise: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="Optionnel"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Telephone responsable</label>
                  <input
                    type="tel"
                    value={enterpriseForm.telephone_responsable_entreprise}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, telephone_responsable_entreprise: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="Optionnel"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Site web</label>
                  <input
                    type="url"
                    value={enterpriseForm.site_web}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, site_web: e.target.value })}
                    className="w-full bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    value={enterpriseForm.description}
                    onChange={e => setEnterpriseForm({ ...enterpriseForm, description: e.target.value })}
                    className="min-h-24 w-full resize-none bg-theme-surface/40 border border-theme-border-subtle/20 rounded-2xl px-4 py-3 text-theme-main focus:bg-theme-surface/60 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
                    placeholder="Activite, contexte, equipe..."
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Nom d'utilisateur</label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-muted group-focus-within:text-secondary transition-colors" />
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl pl-12 pr-4 py-4 text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
              placeholder="Ex: nadege_p"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-muted group-focus-within:text-secondary transition-colors" />
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={`w-full bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl pl-12 pr-4 py-4 text-theme-main outline-none font-bold transition-all ${invitationToken ? 'opacity-50 cursor-not-allowed' : 'focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20'}`}
              readOnly={!!invitationToken}
              placeholder="votre@email.com"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Mot de passe</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-muted group-focus-within:text-secondary transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl pl-12 pr-12 py-4 text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 outline-none font-bold transition-all"
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
          <Button type="submit" loading={isLoading} className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-secondary/20 group">
            <span className="flex items-center justify-center gap-2">
              Créer mon compte <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
            </span>
          </Button>
        </div>
      </form>

      <div className="mt-10 pt-8 border-t border-theme-border-subtle/30 text-center">
        <p className="text-xs font-medium text-theme-muted">
          Déjà inscrit ?{' '}
          <Link to="/login" className="text-secondary font-black uppercase tracking-widest ml-1 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </GlassCard>
  );
}
