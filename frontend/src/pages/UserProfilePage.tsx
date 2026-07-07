// frontend/src/pages/UserProfilePage.tsx
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, MessageCircle, Phone, Shield, UserRound, Calendar, Globe, Briefcase, User, Check } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { sanitizeText, sanitizeHtml } from '../utils/sanitize';
import { authService } from '../services/auth.service';
import type { PublicUserProfile } from '../services/auth.service';
import { messagerieService } from '../services/messagerie.service';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarSrc, getInitials } from '../utils/memberDisplay';
import { cn } from '../lib/utils';
import { toast } from '../components/ui/Toast';
import { sanitizeApiErrorMessage } from '../services/api'; 


const getDisplayName = (profile: PublicUserProfile | null): string => {
  if (!profile) return 'Utilisateur';
  
  const prenoms = sanitizeText(profile.prenoms?.trim() || '');
  const nom = sanitizeText(profile.nom?.trim() || '');
  
  if (prenoms && nom) {
    return `${prenoms} ${nom}`;
  }
  if (prenoms) {
    return prenoms;
  }
  if (nom) {
    return nom;
  }
  if (profile.username) {
    return sanitizeText(profile.username);
  }
  return 'Utilisateur';
};

const formatLastSeen = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "à l'instant";
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `il y a ${diffDays} j`;
  return `le ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
};

const presenceLabel = (isOnline: boolean, lastSeen?: string | null) => {
  if (isOnline) return 'En ligne';
  const formattedLastSeen = formatLastSeen(lastSeen);
  return formattedLastSeen ? `Vu ${formattedLastSeen}` : 'Hors ligne';
};

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const [profileData, presenceData] = await Promise.all([
          authService.getUserProfile(userId),
          messagerieService.getPresence(userId).catch(() => ({ is_online: false, last_seen: null })),
        ]);
        if (!cancelled) {
          console.log('Profil chargé:', profileData);
          setProfile(profileData);
          setIsOnline(Boolean(presenceData.is_online));
          setLastSeen(presenceData.last_seen || null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setProfile(null);
          toast.error(sanitizeApiErrorMessage(err, 'Impossible de charger ce profil.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const avatar = getAvatarSrc(profile?.photo_base64);
  const displayName = getDisplayName(profile);
  const isMe = user?.id === profile?.id;
  const location = [profile?.ville, profile?.pays].filter(Boolean).join(', ');

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <GlassCard className="p-6 sm:p-10 text-center" hover={false}>
          <p className="font-bold text-red-500">Profil introuvable.</p>
          <Link to="/dashboard" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Retour au tableau de bord</Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary transition-colors dark:text-gray-400">
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <GlassCard className="overflow-hidden border-0 shadow-lg" hover={false}>
        <div className="relative bg-gradient-to-r from-primary via-primary/80 to-secondary/60 p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl sm:h-36 sm:w-36 dark:border-slate-800">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 text-5xl font-black text-primary">
                    {getInitials(displayName)}
                  </div>
                )}
                <span className={`absolute bottom-2 right-2 h-3.5 w-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              </div>

              <div className="text-white">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-widest backdrop-blur-sm">
                  <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  {presenceLabel(isOnline, lastSeen)}
                </div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{displayName}</h1>
                <p className="mt-1 text-sm font-semibold text-white/70">@{sanitizeText(profile.username)}</p>
              </div>
            </div>

            {isMe ? (
              <Link to="/profile" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto">
                  <UserRound className="mr-2 h-4 w-4" />
                  Modifier mon profil
                </Button>
              </Link>
            ) : (
              <Link to={`/messagerie?private_user_id=${profile.id}`} className="w-full sm:w-auto">
                <Button className="w-full bg-white text-primary hover:bg-gray-100 sm:w-auto">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Discuter
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
          <InfoCard icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
          <InfoCard icon={<Phone className="h-4 w-4" />} label="Téléphone" value={profile.telephone || 'Non renseigné'} />
          <InfoCard icon={<MapPin className="h-4 w-4" />} label="Localisation" value={location || 'Non renseigné'} />
          <InfoCard icon={<UserRound className="h-4 w-4" />} label="Genre" value={profile.genre || 'Non renseigné'} />
          <div className="md:col-span-2">
            <InfoCard icon={<Shield className="h-4 w-4" />} label="Biographie" value={profile.biographie || 'Aucune biographie'} multiline />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function InfoCard({ icon, label, value, multiline = false }: { icon: ReactNode; label: string; value?: string | null; multiline?: boolean }) {
  const safeValue = sanitizeText(value || '—');

  return (
    <div className="rounded-xl border border-gray-100 bg-white/50 p-4 transition-all hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
        {icon}
        {label}
      </div>
      <p className={cn(
        "text-sm font-semibold text-gray-800 dark:text-slate-200",
        multiline ? "whitespace-pre-wrap leading-relaxed" : "truncate"
      )}>
        {safeValue}
      </p>
    </div>
  );
}