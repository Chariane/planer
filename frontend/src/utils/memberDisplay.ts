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
