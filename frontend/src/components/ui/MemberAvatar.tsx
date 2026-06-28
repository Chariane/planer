// frontend/src/components/ui/MemberAvatar.tsx
import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { AvailabilityBadge } from './AvailabilityBadge';
import type { UserAvailabilityOut } from '../../types';

interface MemberAvatarProps {
  member?: {
    username?: string;
    nom?: string;
    prenoms?: string;
    photo_base64?: string | null;
    utilisateur?: {
      username?: string;
      nom?: string;
      prenoms?: string;
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
  const userInfo = member?.utilisateur || member;

  const photo = userInfo?.photo_base64;
  const username = userInfo?.username || 'U';
  const nom = userInfo?.nom || '';
  const prenoms = userInfo?.prenoms || '';

  const initials = useMemo(() => {
    if (prenoms && nom) return `${prenoms[0]}${nom[0]}`.toUpperCase();
    if (prenoms) return prenoms[0].toUpperCase();
    if (nom) return nom[0].toUpperCase();
    return username.slice(0, 1).toUpperCase();
  }, [username, nom, prenoms]);

  const bgColor = useMemo(() => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-indigo-500',
      'bg-pink-500', 'bg-emerald-500', 'bg-amber-500',
      'bg-cyan-500', 'bg-rose-500'
    ];
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, [username]);

  return (
    <div className={cn("relative inline-block", className)}>
      <div className={cn(
        "flex items-center justify-center overflow-hidden rounded-full font-bold text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10",
        sizeClasses[size],
        !photo && bgColor
      )}>
        {photo ? (
          <img
            src={`data:image/jpeg;base64,${photo}`}
            alt={username}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement?.classList.add(bgColor);
            }}
          />
        ) : (
          initials
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