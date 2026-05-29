import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendVerificationCode } = useAuth();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) setEmail(emailParam);
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email manquant');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await verifyEmail(email, code);
      setSuccess('Email vérifié avec succès ! Redirection vers la connexion...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setError('');
    try {
      await resendVerificationCode(email);
      setSuccess('Un nouveau code a été envoyé à votre adresse email.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du renvoi');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <GlassCard className="p-10 w-full border-theme-border-subtle/30">
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary to-orange-400 flex items-center justify-center font-black text-white text-2xl mx-auto mb-6 shadow-xl shadow-secondary/20"
        >
          KP
        </motion.div>
        <h1 className="text-3xl font-black text-theme-main tracking-tighter uppercase mb-2">Vérification</h1>
        <p className="text-theme-muted text-sm font-medium opacity-60">
          Nous avons envoyé un code à <br />
          <strong className="text-theme-main opacity-100">{email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 p-4 rounded-xl text-xs font-bold leading-relaxed">
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl text-xs font-bold leading-relaxed">
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-theme-muted uppercase tracking-widest ml-1">Code de vérification</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-secondary transition-colors">
              <Shield size={20} />
            </div>
            <input
              type="text"
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-theme-surface/30 border border-theme-border-subtle/20 rounded-2xl text-theme-main focus:bg-theme-surface/50 focus:ring-2 focus:ring-secondary/20 outline-none font-bold tracking-[0.5em] text-center transition-all"
              maxLength={6}
              required
            />
          </div>
        </div>

        <Button type="submit" loading={isLoading} className="w-full py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-secondary/20">
          Vérifier l'adresse
        </Button>
      </form>

      <div className="mt-10 pt-8 border-t border-theme-border-subtle/30 text-center space-y-4">
        <p className="text-xs font-medium text-theme-muted">
          Pas reçu ?{' '}
          <button onClick={handleResend} disabled={resendLoading} className="text-secondary font-black uppercase tracking-widest ml-1 hover:underline disabled:opacity-50">
            {resendLoading ? 'Envoi...' : 'Renvoyer'}
          </button>
        </p>
        <div>
          <Link to="/login" className="text-[10px] font-black text-theme-muted uppercase tracking-widest hover:text-theme-main transition-colors decoration-secondary underline-offset-4">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}