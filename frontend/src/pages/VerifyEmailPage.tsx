// frontend/src/pages/VerifyEmailPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { toast } from '../components/ui/Toast';
import { sanitizeApiErrorMessage } from '../services/api'; // ✅ Import

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendVerificationCode } = useAuth();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
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
      toast.error('Email manquant');
      return;
    }
    setIsLoading(true);
    try {
      await verifyEmail(email, code);
      toast.success('Email vérifié avec succès ! Redirection vers la connexion...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(sanitizeApiErrorMessage(err, 'Code invalide'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      await resendVerificationCode(email);
      toast.success('Un nouveau code a été envoyé à votre adresse email.');
    } catch (err) {
      toast.error(sanitizeApiErrorMessage(err, 'Erreur lors du renvoi'));
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
          className="flex justify-center mb-6"
        >
          <img
            src="/logo.png"
            alt="K-Planner"
            className="h-16 w-auto rounded-2xl shadow-xl shadow-secondary/20"
          />
        </motion.div>
        <h1 className="text-3xl font-black text-theme-main tracking-tighter uppercase mb-2">Vérification</h1>
        <p className="text-theme-muted text-sm font-medium opacity-60">
          Nous avons envoyé un code à <br />
          <strong className="text-theme-main opacity-100">{email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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