import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-bold text-white text-xl mx-auto mb-4">KP</div>
        <h1 className="text-2xl font-bold text-gray-800">Vérifiez votre email</h1>
        <p className="text-gray-500 mt-1">Nous avons envoyé un code à <strong>{email}</strong></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">{success}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code de vérification</label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-secondary"
              maxLength={6}
              required
            />
          </div>
        </div>

        <Button type="submit" loading={isLoading} className="w-full">Vérifier</Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Vous n'avez pas reçu le code ?{' '}
          <button onClick={handleResend} disabled={resendLoading} className="text-secondary hover:underline">
            {resendLoading ? 'Envoi...' : 'Renvoyer'}
          </button>
        </p>
      </div>

      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">Retour à la connexion</Link>
      </div>
    </motion.div>
  );
}