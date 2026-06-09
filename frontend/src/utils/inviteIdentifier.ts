export interface InvitePayload {
  email?: string;
  username?: string;
  role: string;
  id_liste?: string;
  id_tache?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const buildInvitePayload = (identifier: string, role: string): InvitePayload => {
  const value = identifier.trim();
  if (!value || /\s/.test(value)) {
    throw new Error("Entrez une adresse email ou un username valide, sans espace.");
  }

  const normalizedUsername = value.replace(/^@+/, '');

  if (EMAIL_PATTERN.test(value)) {
    return { email: value, role };
  }

  return { username: normalizedUsername, role };
};

export const isValidInviteIdentifier = (identifier: string): boolean => {
  const value = identifier.trim();
  return Boolean(value) && !/\s/.test(value);
};
