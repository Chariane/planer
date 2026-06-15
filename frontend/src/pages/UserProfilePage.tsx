import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, MessageCircle, Phone, Shield, UserRound } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { authService } from '../services/auth.service';
import type { PublicUserProfile } from '../services/auth.service';
import { messagerieService } from '../services/messagerie.service';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarSrc, getInitials } from '../utils/memberDisplay';

const fullName = (profile: PublicUserProfile | null) =>
  [profile?.prenoms, profile?.nom].filter(Boolean).join(' ').trim() || profile?.username || 'Utilisateur';

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
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!userId) return;
      setLoading(true);
      setError('');
      try {
        const [profileData, presenceData] = await Promise.all([
          authService.getUserProfile(userId),
          messagerieService.getPresence(userId).catch(() => ({ is_online: false, last_seen: null })),
        ]);
        if (!cancelled) {
          setProfile(profileData);
          setIsOnline(Boolean(presenceData.is_online));
          setLastSeen(presenceData.last_seen || null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setProfile(null);
          setError(err instanceof Error ? err.message : 'Impossible de charger ce profil.');
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
  const name = fullName(profile);
  const isMe = user?.id === profile?.id;
  const location = [profile?.ville, profile?.pays].filter(Boolean).join(', ');

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <GlassCard className="p-6 sm:p-10 text-center text-theme-muted" hover={false}>Chargement du profil...</GlassCard>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <GlassCard className="p-6 sm:p-10 text-center" hover={false}>
          <p className="font-bold text-red-500">{error || 'Profil introuvable.'}</p>
          <Link to="/dashboard" className="mt-4 inline-flex text-sm font-semibold text-secondary">Retour au tableau de bord</Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-theme-muted hover:text-secondary">
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <GlassCard className="overflow-hidden" hover={false}>
        <div className="relative bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent p-5 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative h-28 w-28 overflow-hidden rounded-[1.5rem] border-4 border-theme-surface bg-theme-surface shadow-2xl sm:h-36 sm:w-36 sm:rounded-[2rem]">
                {avatar ? (
                  <img src={avatar} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary/10 text-5xl font-black text-secondary">
                    {getInitials(name)}
                  </div>
                )}
                <span className={`absolute bottom-3 right-3 h-4 w-4 rounded-full border-2 border-theme-surface ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              </div>

              <div>
                <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-theme-surface-hover text-theme-muted'}`}>
                  <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {presenceLabel(isOnline, lastSeen)}
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-theme-main">{name}</h1>
                <p className="mt-1 text-sm font-semibold text-theme-muted">@{profile.username}</p>
              </div>
            </div>

            {isMe ? (
              <Link to="/profile" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">Modifier mon profil</Button>
              </Link>
            ) : (
              <Link to={`/messagerie?private_user_id=${profile.id}`} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Discuter
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 p-4 sm:p-6 md:grid-cols-2">
          <Info icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
          <Info icon={<Phone className="h-4 w-4" />} label="Téléphone" value={profile.telephone} />
          <Info icon={<MapPin className="h-4 w-4" />} label="Adresse" value={location} />
          <Info icon={<UserRound className="h-4 w-4" />} label="Genre" value={profile.genre} />
          <div className="md:col-span-2">
            <Info icon={<Shield className="h-4 w-4" />} label="Biographie" value={profile.biographie} multiline />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function Info({ icon, label, value, multiline = false }: { icon: ReactNode; label: string; value?: string | null; multiline?: boolean }) {
  return (
    <div className="rounded-2xl border border-theme-border-subtle bg-theme-surface/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-theme-muted">
        {icon}
        {label}
      </div>
      <p className={`text-sm font-semibold text-theme-main ${multiline ? 'whitespace-pre-wrap leading-6' : ''}`}>
        {value || 'Non renseigné'}
      </p>
    </div>
  );
}
