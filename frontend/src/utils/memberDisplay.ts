const looksLikeTechnicalId = (value: string): boolean => {
  return /^[a-f0-9]{12}$/i.test(value) || /^[a-f0-9-]{32,36}$/i.test(value);
};

const pickText = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && !looksLikeTechnicalId(trimmed)) {
        return trimmed;
      }
    }
  }
  return '';
};

export const getMemberDisplayName = (member: any): string => {
  const user = member?.utilisateur || member?.user || {};
  const nestedFullName = [user.prenoms, user.nom].filter(Boolean).join(' ').trim();
  const flatFullName = [member?.prenoms, member?.nom].filter(Boolean).join(' ').trim();

  return pickText(
    nestedFullName,
    flatFullName,
    user.username,
    member?.username,
    member?.name,
    user.email,
    member?.email,
    'Utilisateur',
  );
};

export const getMemberEmail = (member: any): string => {
  return pickText(
    member?.utilisateur?.email,
    member?.user?.email,
    member?.email,
  );
};

export const getMemberPhotoBase64 = (member: any): string | null => {
  const photo = member?.utilisateur?.photo_base64 || member?.user?.photo_base64 || member?.photo_base64;
  return typeof photo === 'string' && photo.trim() ? photo : null;
};

export const getAvatarSrc = (photoBase64?: string | null): string | null =>
  photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : null;

export const getInitials = (label?: string | null): string => {
  const clean = (label || '').trim();
  if (!clean) return 'U';
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
};
