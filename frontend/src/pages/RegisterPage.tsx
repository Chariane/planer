import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { email } = await register(form);
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d’inscription');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center font-bold text-white text-xl mx-auto mb-4">KP</div>
        <h1 className="text-2xl font-bold text-gray-800">Inscription</h1>
        <p className="text-gray-500 mt-1">Rejoignez K‑Planner</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full pl-10 pr-3 py-2 border rounded-lg" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full pl-10 pr-3 py-2 border rounded-lg" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full pl-10 pr-10 py-2 border rounded-lg" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <Button type="submit" loading={isLoading} className="w-full"><UserPlus className="h-4 w-4 mr-2" /> S'inscrire</Button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">Déjà inscrit ? <Link to="/login" className="text-secondary font-medium">Se connecter</Link></p>
    </motion.div>
  );
}