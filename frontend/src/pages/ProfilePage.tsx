import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Camera, Check, Copy, Edit2, Eye, Mail, MapPin, Phone, Save, Shield, Trash2, UserRound, X, Briefcase, Calendar, Globe, GraduationCap, ChevronRight, Hash, User, Lock, ChevronDown } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import Modal from '../components/ui/Modal';
import { sanitizeApiErrorMessage } from '../services/api';
import { cn } from '../lib/utils';

// ✅ SUPPRIMER username et email du formulaire d'édition
const emptyProfileForm = {
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
      // ✅ username et email ne sont PAS dans le formulaire
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
    setTimeout(() => setMessage(''), 4000);
  };

  const showError = (text: string) => {
    setError(text);
    setTimeout(() => setError(''), 4500);
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // ✅ Fonction corrigée : ne pas envoyer date_nais vide
  const handleEditSubmit = async () => {
    try {
      // ✅ Préparer les données avant l'envoi
      const payload = { ...editForm };
      
      // ✅ Si date_nais est vide, on ne l'envoie pas (sera ignoré par le backend)
      if (!payload.date_nais || payload.date_nais === '') {
        delete payload.date_nais;
      }
      
      // ✅ Supprimer les autres champs vides
      for (const [key, value] of Object.entries(payload)) {
        if (value === '' || value === null || value === undefined) {
          delete payload[key as keyof ProfileForm];
        }
      }
      
      await updateProfile(payload);
      setIsEditing(false);
      showMessage('✅ Profil mis à jour avec succès');
    } catch (err: unknown) {
      showError(getErrorMessage(err, '❌ Erreur lors de la mise à jour du profil. Veuillez réessayer.'));
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
        showMessage('✅ Photo de profil mise à jour');
      } catch (err: unknown) {
        showError(getErrorMessage(err, '❌ Impossible de mettre à jour la photo'));
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.onerror = () => {
      setPhotoLoading(false);
      showError('❌ Impossible de lire cette image.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPhotoLoading(true);
    try {
      await updateProfilePhoto(null);
      setPhotoPreview(null);
      showMessage('✅ Photo de profil retirée');
    } catch (err: unknown) {
      showError(getErrorMessage(err, '❌ Impossible de retirer la photo'));
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
      showError('❌ Erreur lors de la préparation 2FA');
    }
  };

  const handleEnable2FA = async () => {
    try {
      await enable2FA(twoFACode);
      setIs2FAModalOpen(false);
      setTwoFASetup(null);
      setTwoFACode('');
      showMessage('✅ 2FA activée avec succès');
    } catch {
      showError('❌ Code 2FA invalide');
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
      showMessage('✅ 2FA désactivée avec succès');
    } catch (err: unknown) {
      showError(getErrorMessage(err, '❌ Erreur lors de la désactivation'));
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
      showMessage('✅ Mot de passe modifié avec succès');
    } catch {
      showError('❌ Mot de passe actuel incorrect');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: <UserRound className="h-4 w-4" /> },
    { id: 'security', label: 'Sécurité & Accès', icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-6xl pb-20 pt-4 px-4 sm:px-6 lg:px-8">
      {/* Cinematic Header Area */}
      <div className="relative mb-32 h-64 overflow-visible rounded-3xl bg-gradient-to-br from-primary/20 via-primary-dark/40 to-secondary/30 shadow-inner">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        
        {/* Floating Avatar Section */}
        <div className="absolute -bottom-24 left-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="relative group">
            <div className="h-40 w-40 overflow-hidden rounded-[2.5rem] border-[6px] border-white dark:border-slate-900 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
              {photoPreview ? (
                <img src={photoPreview} alt="Profil" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 text-5xl font-black text-primary">
                  {initials}
                </div>
              )}
              {photoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                </div>
              )}
            </div>
            <button
               onClick={() => setIsPhotoMenuOpen(!isPhotoMenuOpen)}
               className="absolute -bottom-2 -right-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-xl transition-all hover:bg-primary-dark hover:scale-110 active:scale-95"
            >
              <Camera className="h-6 w-6" />
            </button>

            {/* Photo Menu Dropdown */}
            <AnimatePresence>
              {isPhotoMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute left-0 top-full z-30 mt-4 w-56 rounded-2xl border border-theme-border-subtle bg-white/90 p-2 shadow-2xl backdrop-blur-xl dark:bg-slate-900/90"
                >
                  <button onClick={() => { setIsPhotoViewerOpen(true); setIsPhotoMenuOpen(false); }} disabled={!photoPreview} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-theme-main hover:bg-theme-surface-hover disabled:opacity-50">
                    <Eye className="h-5 w-5 text-primary" /> Voir ma photo
                  </button>
                  <button onClick={() => { fileInputRef.current?.click(); setIsPhotoMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-theme-main hover:bg-theme-surface-hover">
                    <Camera className="h-5 w-5 text-secondary" /> Modifier la photo
                  </button>
                  {photoPreview && (
                    <button onClick={() => { handleRemovePhoto(); setIsPhotoMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10">
                      <Trash2 className="h-5 w-5" /> Retirer la photo
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mb-4">
            <h1 className="text-3xl font-black tracking-tight text-theme-main sm:text-4xl">{fullName}</h1>
            <div className="mt-1 flex items-center gap-2 text-theme-muted">
              <Hash className="h-4 w-4 text-secondary/60" />
              <span className="text-sm font-bold uppercase tracking-widest">{user?.username}</span>
              <span className="h-1 w-1 rounded-full bg-theme-muted/50"></span>
              <span className="text-xs font-medium italic">Membre depuis {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Right Action Button - Desktop only */}
        <div className="absolute -bottom-6 right-8 hidden lg:block">
          <AnimatedButton 
             onClick={() => setIsEditing(!isEditing)}
             variant={isEditing ? "outline" : "primary"}
             className={cn("shadow-xl ring-8 ring-white dark:ring-slate-950", isEditing ? "bg-white dark:bg-slate-900" : "")}
          >
            {isEditing ? (
              <><X className="mr-2 h-5 w-5" /> Annuler</>
            ) : (
              <><Edit2 className="mr-2 h-5 w-5" /> Modifier mon profil</>
            )}
          </AnimatedButton>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(e.target.files?.[0])} />

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* Sidebar / Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-6" hover={false}>
            <div className="space-y-6">
               <div>
                 <div className="mb-2 flex items-center justify-between">
                   <h3 className="text-sm font-black uppercase tracking-wider text-theme-muted">Profil complété</h3>
                   <span className="text-lg font-black text-secondary">{completion}%</span>
                 </div>
                 <div className="h-3 w-full overflow-hidden rounded-full bg-theme-surface shadow-inner">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${completion}%` }}
                     transition={{ duration: 1, ease: "easeOut" }}
                     className="h-full bg-gradient-to-r from-primary to-secondary"
                   />
                 </div>
                 <p className="mt-3 text-[10px] leading-relaxed text-theme-muted">
                   Un profil complet améliore votre visibilité lors des collaborations dans les espaces et listes.
                 </p>
               </div>

               <div className="space-y-4 border-t border-theme-border-subtle pt-6">
                  <QuickInfo icon={<Mail />} label="Email" value={user?.email} />
                  <QuickInfo icon={<MapPin />} label="Localisation" value={[user?.ville, user?.pays].filter(Boolean).join(', ')} />
                  <QuickInfo icon={<Briefcase />} label="Rôle" value="Collaborateur" />
               </div>
            </div>
          </GlassCard>

          {/* Social Links / Achievements (Placeholder for elegance) */}
          <div className="hidden lg:block space-y-4">
             <h3 className="text-xs font-black uppercase tracking-widest text-theme-muted ml-1">Statistiques & Réussites</h3>
             <div className="grid grid-cols-2 gap-4">
                <StatCard label="Tâches" value="128" />
                <StatCard label="Rapports" value="12" />
             </div>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Navigation Profile Area */}
          <div className="flex flex-col gap-6">
             <div className="flex items-center gap-1 overflow-hidden rounded-2xl bg-theme-surface/50 p-1.5 border border-theme-border-subtle shadow-sm">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-300",
                      activeTab === tab.id ? "text-primary shadow-sm" : "text-theme-muted hover:text-theme-main hover:bg-theme-surface"
                    )}
                  >
                    {activeTab === tab.id && (
                      <motion.div layoutId="activeTab" className="absolute inset-0 rounded-xl bg-white dark:bg-slate-800" />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                       {tab.icon}
                       {tab.label}
                    </span>
                  </button>
                ))}
             </div>

             <div className="min-h-[400px]">
               <AnimatePresence mode="wait">
                  {activeTab === 'profile' ? (
                    <motion.div
                      key="profile-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      {!isEditing ? (
                        <div className="grid gap-6">
                           <PremiumSection title="Aperçu Général" icon={<User className="h-5 w-5" />}>
                              <div className="grid gap-4 sm:grid-cols-2">
                                 <InfoCard label="Nom" value={user?.nom} icon={<UserRound />} />
                                 <InfoCard label="Prénoms" value={user?.prenoms} icon={<UserRound />} />
                                 <InfoCard label="Genre" value={user?.genre} icon={<User />} />
                                 <InfoCard label="Anniversaire" value={toDateInputValue(user?.date_nais)} icon={<Calendar />} />
                              </div>
                           </PremiumSection>

                           <PremiumSection title="Contact & Réseaux" icon={<Globe className="h-5 w-5" />}>
                              <div className="grid gap-4 sm:grid-cols-2">
                                 <InfoCard label="Téléphone" value={user?.telephone} icon={<Phone />} />
                                 <InfoCard label="Pays" value={user?.pays} icon={<Globe />} />
                              </div>
                           </PremiumSection>

                           <PremiumSection title="Biographie professionnelle" icon={<GraduationCap className="h-5 w-5" />}>
                              <GlassCard className="p-5 bg-white/40 dark:bg-slate-800/40" hover={false}>
                                 <p className="text-sm leading-relaxed text-theme-main">
                                    {user?.biographie || "Aucune biographie renseignée pour le moment. Cliquez sur 'Modifier' pour en ajouter une."}
                                 </p>
                              </GlassCard>
                           </PremiumSection>

                           <div className="lg:hidden">
                             <AnimatedButton onClick={() => setIsEditing(true)} className="w-full py-4 text-lg">
                               Modifier mon profil
                             </AnimatedButton>
                           </div>
                        </div>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-8"
                        >
                           <GlassCard className="p-8" hover={false}>
                              <div className="space-y-8">
                                 {/* ✅ Informations de lecture seule : Email & Username */}
                                 <div className="grid gap-6 sm:grid-cols-2 bg-theme-surface/30 rounded-2xl p-4 border border-theme-border-subtle">
                                    <div>
                                       <label className="text-xs font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                          <Lock className="h-3 w-3" /> Email
                                       </label>
                                       <p className="mt-1 text-sm font-semibold text-theme-main opacity-70">{user?.email}</p>
                                       <p className="mt-0.5 text-[10px] text-theme-muted">Non modifiable</p>
                                    </div>
                                    <div>
                                       <label className="text-xs font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                          <Lock className="h-3 w-3" /> Nom d'utilisateur
                                       </label>
                                       <p className="mt-1 text-sm font-semibold text-theme-main opacity-70">@{user?.username}</p>
                                       <p className="mt-0.5 text-[10px] text-theme-muted">Non modifiable</p>
                                    </div>
                                 </div>

                                 {/* ✅ Champs modifiables avec le champ Genre en select */}
                                 <div className="grid gap-6 sm:grid-cols-2">
                                    <PremiumInput label="Nom" value={editForm.nom} onChange={(v) => updateField('nom', v)} />
                                    <PremiumInput label="Prénoms" value={editForm.prenoms} onChange={(v) => updateField('prenoms', v)} />
                                    <PremiumInput label="Téléphone" value={editForm.telephone} onChange={(v) => updateField('telephone', v)} icon={<Phone />} />
                                    <PremiumInput label="Date de naissance" type="date" value={editForm.date_nais} onChange={(v) => updateField('date_nais', v)} icon={<Calendar />} />
                                    
                                    {/* ✅ Champ Genre en select */}
                                    <div className="space-y-2">
                                      <label className="text-xs font-black text-theme-muted ml-1 uppercase tracking-widest opacity-80">Genre</label>
                                      <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted transition-colors group-focus-within:text-primary">
                                          <User className="h-4 w-4" />
                                        </div>
                                        <select
                                          value={editForm.genre}
                                          onChange={(e) => updateField('genre', e.target.value)}
                                          className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface/50 py-3 pl-11 pr-10 text-sm font-bold text-theme-main shadow-inner outline-none transition-all appearance-none focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/5 dark:focus:bg-slate-900"
                                        >
                                          <option value="">Sélectionnez votre genre</option>
                                          <option value="Homme">Homme</option>
                                          <option value="Femme">Femme</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted">
                                          <ChevronDown className="h-4 w-4" />
                                        </div>
                                      </div>
                                    </div>

                                    <PremiumInput label="Ville" value={editForm.ville} onChange={(v) => updateField('ville', v)} icon={<MapPin />} />
                                    <PremiumInput label="Pays" value={editForm.pays} onChange={(v) => updateField('pays', v)} icon={<Globe />} />
                                 </div>

                                 <div className="space-y-2">
                                    <label className="text-sm font-black text-theme-main ml-1 uppercase tracking-widest opacity-80">Biographie</label>
                                    <textarea 
                                       value={editForm.biographie} 
                                       onChange={(e) => updateField('biographie', e.target.value)}
                                       rows={6}
                                       className="w-full resize-none rounded-2xl border border-theme-border-subtle bg-theme-surface/50 p-4 text-sm text-theme-main shadow-inner outline-none transition-all focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/5 dark:focus:bg-slate-900"
                                       placeholder="Parlez-nous un peu de vous..."
                                    />
                                 </div>
                                 <div className="flex items-center justify-end gap-4 border-t border-theme-border-subtle pt-6">
                                    <Button variant="ghost" onClick={() => setIsEditing(false)} className="font-bold">Annuler</Button>
                                    <AnimatedButton onClick={handleEditSubmit} className="px-8 shadow-xl">
                                      <Save className="mr-2 h-5 w-5" /> Enregistrer les modifications
                                    </AnimatedButton>
                                 </div>
                              </div>
                           </GlassCard>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="security-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                       <PremiumSection title="Double Authentification (2FA)" icon={<Shield className="h-6 w-6" />}>
                          <div className="p-2">
                            <p className="text-sm text-theme-muted mb-6">
                               Renforcez la sécurité de votre compte en exigeant un code de vérification supplémentaire lors de la connexion.
                            </p>
                            
                            {user?.is_2fa_enabled ? (
                              <div className="flex items-center justify-between rounded-2xl bg-emerald-500/5 p-6 border border-emerald-500/20">
                                 <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg">
                                       <Check className="h-6 w-6" />
                                    </div>
                                    <div>
                                       <p className="font-black text-emerald-600 uppercase tracking-widest text-xs">Protection Active</p>
                                       <p className="text-sm text-emerald-800/70">Votre compte est sécurisé par 2FA.</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <input 
                                       type="password" 
                                       placeholder="Mot de passe pour désactiver" 
                                       value={disablePassword} 
                                       onChange={(e) => setDisablePassword(e.target.value)} 
                                       className="rounded-xl border border-emerald-500/30 bg-white px-4 py-2 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10"
                                    />
                                    <Button variant="outline" className="text-red-500 border-red-500/20" onClick={handleDisable2FA}>Désactiver</Button>
                                 </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-theme-border-subtle p-12 text-center group transition-colors hover:border-primary/30">
                                 <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-theme-surface text-theme-muted transition-all group-hover:bg-primary group-hover:text-white group-hover:scale-110 shadow-lg">
                                    <Shield className="h-10 w-10" />
                                 </div>
                                 <h3 className="text-lg font-bold text-theme-main">Non activé</h3>
                                 <p className="mt-2 text-sm text-theme-muted max-w-sm">Recommandé : Utilisez Google Authenticator pour protéger vos données.</p>
                                 <AnimatedButton onClick={handleSetup2FA} className="mt-8 px-10">
                                    Démarrer la configuration
                                 </AnimatedButton>
                              </div>
                            )}
                          </div>
                       </PremiumSection>

                       <PremiumSection title="Modification du mot de passe" icon={<Edit2 className="h-6 w-6" />}>
                          <GlassCard className="p-8 bg-white/40 dark:bg-slate-800/40" hover={false}>
                             <div className="space-y-6 max-w-md mx-auto">
                                <PremiumInput 
                                   label="Mot de passe actuel" 
                                   type="password" 
                                   value={passwordForm.current} 
                                   onChange={(v) => setPasswordForm({ ...passwordForm, current: v })} 
                                />
                                <div className="grid gap-6 sm:grid-cols-2">
                                   <PremiumInput 
                                      label="Nouveau mot de passe" 
                                      type="password" 
                                      value={passwordForm.new} 
                                      onChange={(v) => setPasswordForm({ ...passwordForm, new: v })} 
                                   />
                                   <PremiumInput 
                                      label="Confirmer" 
                                      type="password" 
                                      value={passwordForm.confirm} 
                                      onChange={(v) => setPasswordForm({ ...passwordForm, confirm: v })} 
                                   />
                                </div>
                                <div className="pt-4">
                                   <AnimatedButton onClick={handleChangePassword} className="w-full py-3">
                                      Mettre à jour le mot de passe
                                   </AnimatedButton>
                                </div>
                             </div>
                          </GlassCard>
                       </PremiumSection>
                    </motion.div>
                  )}
               </AnimatePresence>
             </div>
          </div>
        </div>
      </div>

      {/* Modals & Notifications */}
      <Modal isOpen={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)} title="Sécurisez votre compte" size="lg">
        {twoFASetup && (
          <div className="space-y-8 p-4">
            <div className="flex flex-col items-center gap-6 text-center">
               <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
                  <QRCodeCanvas value={twoFASetup.google_authenticator_otpauth_url || ''} size={220} />
               </div>
               <div className="space-y-2">
                  <p className="text-base font-bold text-theme-main">Scannez le code QR</p>
                  <p className="text-sm text-theme-muted max-w-xs">Ouvrez votre application d'authentification et scannez ce code pour configurer votre compte.</p>
               </div>
            </div>

            <div className="space-y-3">
               <label className="text-xs font-black uppercase tracking-widest text-theme-muted ml-1">Clé secrète (Manuelle)</label>
               <div className="flex items-center gap-3 rounded-2xl bg-theme-surface p-3 border border-theme-border-subtle">
                  <code className="flex-1 font-mono text-sm font-bold text-primary truncate pl-2">{twoFASetup.google_authenticator_secret}</code>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(twoFASetup.google_authenticator_secret || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-theme-main shadow-sm transition-transform active:scale-90"
                  >
                     {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5 opacity-60" />}
                  </button>
               </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-theme-border-subtle">
               <label className="text-sm font-bold text-theme-main">Entrez le code de vérification</label>
               <input 
                  type="text" 
                  maxLength={6}
                  placeholder="000 000" 
                  value={twoFACode} 
                  onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))} 
                  className="w-full text-center text-3xl font-black tracking-[0.5em] h-16 rounded-2xl border-2 border-theme-border bg-theme-surface focus:border-secondary focus:ring-4 focus:ring-secondary/5 transition-all text-secondary" 
               />
               <AnimatedButton onClick={handleEnable2FA} className="w-full py-4 text-lg">
                  Confirmer et Activer
               </AnimatedButton>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isPhotoViewerOpen} onClose={() => setIsPhotoViewerOpen(false)} title="Visualisation Photo" size="md">
        <div className="p-4">
           <div className="overflow-hidden rounded-[2.5rem] shadow-2xl ring-1 ring-black/5">
              {photoPreview ? (
                <img src={photoPreview} alt="Grand Format" className="w-full h-auto object-contain bg-white dark:bg-slate-900" />
              ) : (
                <div className="flex h-64 w-full items-center justify-center bg-gray-50 text-6xl">{initials}</div>
              )}
           </div>
        </div>
      </Modal>

      <AnimatePresence>
        {(message || error) && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 right-8 z-[100] flex items-center gap-3 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-xl border-l-[6px]",
              message ? "bg-emerald-500/90 text-white border-emerald-400" : "bg-red-500/90 text-white border-red-400"
            )}
          >
            {message ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
            <span className="font-bold">{message || error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components for better organization & premium feel

function PremiumSection({ title, children, icon }: { title: string; children: ReactNode; icon: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="text-secondary/80">{icon}</div>
        <h2 className="text-sm font-black uppercase tracking-widest text-theme-muted">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string; value?: string | null; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-theme-border-subtle bg-white/40 dark:bg-slate-800/40 p-4 transition-all hover:bg-white dark:hover:bg-slate-800 hover:shadow-md group">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-surface text-theme-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-0.5">{label}</p>
        <p className="text-sm font-bold text-theme-main truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function PremiumInput({ label, value, onChange, type = 'text', icon }: { label: string; value: string; onChange: (v: string) => void; type?: string; icon?: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-theme-muted ml-1 uppercase tracking-widest opacity-80">{label}</label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted transition-colors group-focus-within:text-primary">
            {icon}
          </div>
        )}
        <input 
          type={type} 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className={cn(
            "w-full rounded-2xl border border-theme-border-subtle bg-theme-surface/50 py-3 text-sm font-bold text-theme-main shadow-inner outline-none transition-all placeholder:font-medium focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/5 dark:focus:bg-slate-900",
            icon ? "pl-11 pr-4" : "px-4"
          )}
          placeholder={`Entrez votre ${label.toLowerCase()}...`}
        />
      </div>
    </div>
  );
}

function QuickInfo({ label, value, icon }: { label: string; value?: string | null; icon: ReactNode }) {
   return (
      <div className="flex items-center gap-3 text-theme-main">
         <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-theme-surface text-theme-muted [&_svg]:h-3 [&_svg]:w-3">
            {icon}
         </div>
         <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-theme-muted">{label}</p>
            <p className="text-xs font-bold truncate">{value || "Non renseigné"}</p>
         </div>
         <ChevronRight className="h-3 w-3 text-theme-muted opacity-30" />
      </div>
   );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-theme-border-subtle bg-white/40 dark:bg-slate-800/40 p-4 text-center transition-all hover:bg-white dark:hover:bg-slate-800">
      <p className="text-xl font-black text-primary">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mt-1">{label}</p>
    </div>
  );
}