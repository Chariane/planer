import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Camera, Check, Copy, Edit2, Eye, Mail, MapPin, Phone, Save, Shield, Trash2, UserRound, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { sanitizeApiErrorMessage } from '../services/api';

const emptyProfileForm = {
  username: '',
  email: '',
  nom: '',
  prenoms: '',
  telephone: '',
  pays: '',
  ville: '',
  genre: '',
  date_nais: '',
  biographie: '',
};

type ProfileForm = typeof emptyProfileForm;

interface TwoFASetupPayload {
  google_authenticator_secret?: string;
  google_authenticator_otpauth_url?: string;
}

const buildPhotoSrc = (photoBase64?: string | null, mimeType?: string | null) =>
  photoBase64 ? `data:${mimeType || 'image/jpeg'};base64,${photoBase64}` : null;

const toDateInputValue = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const getErrorMessage = (error: unknown, fallback: string) =>
  sanitizeApiErrorMessage(error, fallback);

export default function ProfilePage() {
  const {
    user,
    updateProfile,
    getProfilePhoto,
    updateProfilePhoto,
    setup2FA,
    enable2FA,
    disable2FA,
    changePassword,
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProfileForm>(emptyProfileForm);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFASetup, setTwoFASetup] = useState<TwoFASetupPayload | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [copied, setCopied] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fullName = [user?.prenoms, user?.nom].filter(Boolean).join(' ') || user?.username || 'Utilisateur';
  const initials = (user?.prenoms?.[0] || user?.username?.[0] || 'U').toUpperCase();

  const completion = useMemo(() => {
    const fields = [
      user?.nom,
      user?.prenoms,
      user?.telephone,
      user?.pays,
      user?.ville,
      user?.biographie,
      user?.genre,
      user?.date_nais,
      photoPreview,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [photoPreview, user]);

  useEffect(() => {
    setEditForm({
      username: user?.username || '',
      email: user?.email || '',
      nom: user?.nom || '',
      prenoms: user?.prenoms || '',
      telephone: user?.telephone || '',
      pays: user?.pays || '',
      ville: user?.ville || '',
      genre: user?.genre || '',
      date_nais: toDateInputValue(user?.date_nais),
      biographie: user?.biographie || '',
    });
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const loadPhoto = async () => {
      try {
        const photo = await getProfilePhoto();
        if (mounted) setPhotoPreview(buildPhotoSrc(photo?.photoBase64, photo?.mimeType));
      } catch {
        if (mounted) setPhotoPreview(null);
      }
    };
    loadPhoto();
    return () => {
      mounted = false;
    };
  }, [getProfilePhoto, user?.id]);

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const showError = (text: string) => {
    setError(text);
    setTimeout(() => setError(''), 3500);
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async () => {
    try {
      await updateProfile(editForm);
      setIsEditing(false);
      showMessage('Profil mis à jour avec succès');
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Erreur lors de la mise à jour'));
    }
  };

  const handlePhotoChange = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Veuillez choisir une image valide.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError('La photo ne doit pas dépasser 2 Mo.');
      return;
    }

    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const photoDataUrl = String(reader.result);
        const savedPhotoBase64 = await updateProfilePhoto(photoDataUrl);
        setPhotoPreview(buildPhotoSrc(savedPhotoBase64) || photoDataUrl);
        showMessage('Photo de profil mise à jour');
      } catch (err: unknown) {
        showError(getErrorMessage(err, 'Impossible de mettre à jour la photo'));
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.onerror = () => {
      setPhotoLoading(false);
      showError('Impossible de lire cette image.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPhotoLoading(true);
    try {
      await updateProfilePhoto(null);
      setPhotoPreview(null);
      showMessage('Photo de profil retirée');
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Impossible de retirer la photo'));
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const data = await setup2FA();
      setTwoFASetup(data);
      setIs2FAModalOpen(true);
    } catch {
      showError('Erreur lors de la préparation 2FA');
    }
  };

  const handleEnable2FA = async () => {
    try {
      await enable2FA(twoFACode);
      setIs2FAModalOpen(false);
      setTwoFASetup(null);
      setTwoFACode('');
      showMessage('2FA activée avec succès');
    } catch {
      showError('Code 2FA invalide');
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      showError('Veuillez entrer votre mot de passe');
      return;
    }
    try {
      await disable2FA(disablePassword);
      setDisablePassword('');
      showMessage('2FA désactivée avec succès');
    } catch (err: unknown) {
      showError(getErrorMessage(err, 'Erreur lors de la désactivation'));
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      showError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    try {
      await changePassword(passwordForm.current, passwordForm.new);
      setPasswordForm({ current: '', new: '', confirm: '' });
      showMessage('Mot de passe modifié avec succès');
    } catch {
      showError('Mot de passe actuel incorrect');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 sm:px-0">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-main">Mon profil</h1>
          <p className="mt-1 text-sm text-theme-muted">
            Ces informations seront utilisées dans la messagerie, les rapports et les espaces collaboratifs.
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
            <Edit2 className="mr-2 h-4 w-4" />
            Compléter mon profil
          </Button>
        )}
      </div>

      <GlassCard className="overflow-hidden" hover={false}>
        <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
          <div className="border-b border-theme-subtle bg-theme-surface-hover/50 p-4 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-theme-surface bg-secondary/10 text-4xl font-bold text-secondary shadow-theme-lg">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Photo de profil" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <button
                  onClick={() => setIsPhotoMenuOpen(prev => !prev)}
                  disabled={photoLoading}
                  className="absolute inset-0 rounded-full transition hover:bg-black/10 disabled:opacity-60"
                  title="Options de photo"
                  aria-label="Options de photo"
                />
                <button
                  onClick={() => setIsPhotoMenuOpen(prev => !prev)}
                  disabled={photoLoading}
                  className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-white shadow-lg transition hover:bg-secondary/90 disabled:opacity-60"
                  title="Options de photo"
                  aria-label="Options de photo"
                >
                  <Camera className="h-5 w-5" />
                </button>
                {isPhotoMenuOpen && (
                  <div className="absolute left-1/2 top-full z-20 mt-3 w-44 -translate-x-1/2 rounded-2xl border border-theme-border-subtle bg-theme-surface p-1.5 text-left shadow-2xl">
                    <button
                      onClick={() => {
                        setIsPhotoViewerOpen(true);
                        setIsPhotoMenuOpen(false);
                      }}
                      disabled={!photoPreview}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-theme-main transition hover:bg-theme-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Eye className="h-4 w-4" />
                      Voir
                    </button>
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setIsPhotoMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-theme-main transition hover:bg-theme-surface-hover"
                    >
                      <Camera className="h-4 w-4" />
                      Modifier
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handlePhotoChange(event.target.files?.[0])}
              />
              <h2 className="mt-4 text-xl font-semibold text-theme-main">{fullName}</h2>
              <p className="text-sm text-theme-muted">@{user?.username}</p>
              <div className="mt-5 w-full">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-theme-muted">Profil complété</span>
                  <span className="font-bold text-secondary">{completion}%</span>
                </div>
                <div className="h-2 rounded-full bg-theme-surface">
                  <div className="h-2 rounded-full bg-secondary transition-all" style={{ width: `${completion}%` }} />
                </div>
              </div>
              {photoPreview && (
                <Button variant="ghost" size="sm" className="mt-4 text-red-500 hover:text-red-600" onClick={handleRemovePhoto} loading={photoLoading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Retirer la photo
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="mb-6 border-b border-theme-subtle">
              <nav className="flex gap-4 overflow-x-auto">
                <button onClick={() => setActiveTab('profile')} className={`pb-3 text-sm font-semibold ${activeTab === 'profile' ? 'border-b-2 border-secondary text-secondary' : 'text-theme-muted'}`}>Informations</button>
                <button onClick={() => setActiveTab('security')} className={`pb-3 text-sm font-semibold ${activeTab === 'security' ? 'border-b-2 border-secondary text-secondary' : 'text-theme-muted'}`}>Sécurité</button>
              </nav>
            </div>

            {activeTab === 'profile' && (
              <div className="space-y-5">
                {!isEditing ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoItem icon={<UserRound className="h-4 w-4" />} label="Nom complet" value={fullName} />
                      <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email} />
                      <InfoItem icon={<Phone className="h-4 w-4" />} label="Téléphone" value={user?.telephone} />
                      <InfoItem icon={<MapPin className="h-4 w-4" />} label="Localisation" value={[user?.ville, user?.pays].filter(Boolean).join(', ')} />
                    </div>
                    <InfoItem label="Biographie" value={user?.biographie} multiline />
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Modifier mes informations
                    </Button>
                  </>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextField label="Nom d'utilisateur" value={editForm.username} onChange={value => updateField('username', value)} />
                      <TextField label="Email" type="email" value={editForm.email} onChange={value => updateField('email', value)} />
                      <TextField label="Nom" value={editForm.nom} onChange={value => updateField('nom', value)} />
                      <TextField label="Prénoms" value={editForm.prenoms} onChange={value => updateField('prenoms', value)} />
                      <TextField label="Téléphone" value={editForm.telephone} onChange={value => updateField('telephone', value)} />
                      <TextField label="Date de naissance" type="date" value={editForm.date_nais} onChange={value => updateField('date_nais', value)} />
                      <TextField label="Ville" value={editForm.ville} onChange={value => updateField('ville', value)} />
                      <TextField label="Pays" value={editForm.pays} onChange={value => updateField('pays', value)} />
                      <SelectField label="Genre" value={editForm.genre} onChange={value => updateField('genre', value)} />
                    </div>
                    <TextAreaField label="Biographie" value={editForm.biographie} onChange={value => updateField('biographie', value)} />
                    <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                      <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full sm:w-auto">
                        <X className="mr-2 h-4 w-4" />
                        Annuler
                      </Button>
                      <Button onClick={handleEditSubmit} className="w-full sm:w-auto">
                        <Save className="mr-2 h-4 w-4" />
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <section className="rounded-xl border border-theme-subtle p-4">
                  <h2 className="mb-4 text-lg font-semibold text-theme-main">Authentification à deux facteurs</h2>
                  {user?.is_2fa_enabled ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-emerald-600">2FA activée</p>
                      <input type="password" placeholder="Mot de passe actuel" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} className="w-full max-w-sm rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-main" />
                      <Button variant="outline" onClick={handleDisable2FA}>Désactiver 2FA</Button>
                    </div>
                  ) : (
                    <Button onClick={handleSetup2FA}><Shield className="mr-2 h-4 w-4" /> Activer 2FA</Button>
                  )}
                </section>

                <section className="rounded-xl border border-theme-subtle p-4">
                  <h2 className="mb-4 text-lg font-semibold text-theme-main">Changer le mot de passe</h2>
                  <div className="space-y-3 max-w-md">
                    <input type="password" placeholder="Mot de passe actuel" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-main" />
                    <input type="password" placeholder="Nouveau mot de passe" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-main" />
                    <input type="password" placeholder="Confirmer" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-main" />
                    <Button onClick={handleChangePassword}>Modifier le mot de passe</Button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <Modal isOpen={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)} title="Activer l'authentification à deux facteurs" size="lg">
        {twoFASetup && (
          <div className="space-y-4">
            <p className="text-sm text-theme-muted">Scannez ce QR code avec Google Authenticator.</p>
            <div className="flex justify-center"><QRCodeCanvas value={twoFASetup.google_authenticator_otpauth_url || ''} size={200} /></div>
            <p className="text-sm text-theme-muted">Ou saisissez ce code secret :</p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-theme-surface-hover p-2 text-sm text-theme-main">{twoFASetup.google_authenticator_secret || ''}</code>
              <button onClick={() => { navigator.clipboard.writeText(twoFASetup.google_authenticator_secret || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}</button>
            </div>
            <input type="text" placeholder="Code à 6 chiffres" value={twoFACode} onChange={e => setTwoFACode(e.target.value)} className="w-full rounded-lg border border-theme-border bg-theme-surface p-2 text-theme-main" />
            <Button onClick={handleEnable2FA}>Activer</Button>
          </div>
        )}
      </Modal>

      <Modal isOpen={isPhotoViewerOpen} onClose={() => setIsPhotoViewerOpen(false)} title="Photo de profil" size="md">
        <div className="flex justify-center">
          {photoPreview ? (
            <img src={photoPreview} alt="Photo de profil" className="max-h-[60vh] rounded-2xl object-contain shadow-theme-lg" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-secondary/10 text-5xl font-black text-secondary">
              {initials}
            </div>
          )}
        </div>
      </Modal>

      {message && <div className="fixed bottom-4 right-4 rounded-lg bg-green-100 p-3 text-green-700 shadow">{message}</div>}
      {error && <div className="fixed bottom-4 right-4 rounded-lg bg-red-100 p-3 text-red-700 shadow">{error}</div>}
    </div>
  );
}

function InfoItem({ label, value, icon, multiline = false }: { label: string; value?: string | null; icon?: ReactNode; multiline?: boolean }) {
  return (
    <div className="rounded-xl border border-theme-subtle bg-theme-surface/70 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-theme-muted">
        {icon}
        {label}
      </div>
      <p className={`text-sm text-theme-main ${multiline ? 'whitespace-pre-wrap leading-6' : ''}`}>{value || 'Non renseigné'}</p>
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-theme-muted">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-main outline-none focus:ring-2 focus:ring-secondary/40" />
    </label>
  );
}

function SelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-theme-muted">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-main outline-none focus:ring-2 focus:ring-secondary/40">
        <option value="">Non renseigné</option>
        <option value="Homme">Homme</option>
        <option value="Femme">Femme</option>
        <option value="Autre">Autre</option>
      </select>
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-theme-muted">{label}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={4} className="w-full resize-none rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-main outline-none focus:ring-2 focus:ring-secondary/40" />
    </label>
  );
}
