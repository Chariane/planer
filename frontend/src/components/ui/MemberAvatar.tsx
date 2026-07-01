// frontend/src/components/ui/MemberAvatar.tsx
import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { AvailabilityBadge } from './AvailabilityBadge';
import type { UserAvailabilityOut } from '../../types';

interface MemberAvatarProps {
  member?: {
    id?: string;
    username?: string;
    nom?: string;
    prenoms?: string;
    name?: string;          // fallback
    photo_base64?: string | null;
    utilisateur?: {
      id?: string;
      username?: string;
      nom?: string;
      prenoms?: string;
      name?: string;
      photo_base64?: string | null;
    } | null;
  } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'idle' | 'busy';
  availability?: UserAvailabilityOut;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
};

const statusClasses = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-300 dark:bg-slate-700',
  idle: 'bg-amber-500',
  busy: 'bg-red-500',
};

export function MemberAvatar({
  member,
  size = 'md',
  className,
  showStatus = false,
  status = 'offline',
  availability
}: MemberAvatarProps) {
  // Récupère l'utilisateur imbriqué ou le membre lui-même
  const userInfo = member?.utilisateur || member;

  const photo = userInfo?.photo_base64;
  const username = userInfo?.username || '';
  const nom = userInfo?.nom || '';
  const prenoms = userInfo?.prenoms || '';
  const name = userInfo?.name || ''; // champ additionnel

  // Calcul des initiales robuste
  const initials = useMemo(() => {
    // 1. À partir de prenoms + nom
    if (prenoms && nom) return `${prenoms[0]}${nom[0]}`.toUpperCase();
    // 2. À partir de prenoms seul
    if (prenoms) return prenoms[0].toUpperCase();
    // 3. À partir de nom seul
    if (nom) return nom[0].toUpperCase();
    // 4. À partir de username
    if (username) return username.slice(0, 1).toUpperCase();
    // 5. À partir de name (ex: "Jean Dupont" -> "JD")
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    // 6. Dernier recours : utiliser l'id (si présent) pour éviter '?'
    if (userInfo?.id) {
      return userInfo.id.slice(0, 2).toUpperCase();
    }
    return '?';
  }, [username, nom, prenoms, name, userInfo?.id]);

  // Couleur de fond basée sur un identifiant stable (username ou id)
  const bgColor = useMemo(() => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-indigo-500',
      'bg-pink-500', 'bg-emerald-500', 'bg-amber-500',
      'bg-cyan-500', 'bg-rose-500'
    ];
    const key = username || userInfo?.id || '?';
    const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, [username, userInfo?.id]);

  // Nom affiché au survol
  const displayName = username || name || prenoms || nom || 'Membre';

  return (
    <div className={cn("relative inline-block", className)}>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full font-bold text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10",
          sizeClasses[size],
          !photo && bgColor
        )}
        title={displayName}
      >
        {photo ? (
          <img
            src={`data:image/jpeg;base64,${photo}`}
            alt={displayName}
            className="h-full w-full object-cover"
            onError={(e) => {
              // En cas d'erreur de chargement, on affiche les initiales
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement?.classList.add(bgColor);
            }}
          />
        ) : (
          <span className="select-none">{initials}</span>
        )}
      </div>

      {availability && (
        <div className="absolute -bottom-1 -right-1">
          <AvailabilityBadge
            availability={availability}
            size={size === 'xs' ? 'sm' : 'md'}
          />
        </div>
      )}

      {!availability && showStatus && (
        <span className={cn(
          "absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-slate-900",
          size === 'xs' ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5',
          statusClasses[status]
        )} />
      )}
    </div>
  );
}