import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle, CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { sanitizeText, sanitizeHtml } from '../utils/sanitize';
import { entrepriseService, type EntrepriseOverview, type EntrepriseProfilePayload } from '../services/entreprise.service';
import { planService, type PlanUsageOverview, type SubscriptionPlan } from '../services/plan.service';
import { sanitizeApiErrorMessage } from '../services/api';

const emptyForm: EntrepriseProfilePayload = {
  nom: '',
  description: '',
  statut_juridique: '',
  adresse: '',
  telephone: '',
  numero_ifu: '',
  numero_rccm: '',
  nom_responsable_entreprise: '',
  prenoms_responsable_entreprise: '',
  telephone_responsable_entreprise: '',
  site_web: '',
};

const formatMoney = (value: string | number | undefined, devise = 'XOF') => {
  const amount = Number(value || 0);
  if (amount === 0) return 'Gratuit';
  return `${amount.toLocaleString('fr-FR')} ${devise}`;
};

export default function EntreprisePage() {
  const [overview, setOverview] = useState<EntrepriseOverview | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [usageOverview, setUsageOverview] = useState<PlanUsageOverview | null>(null);
  const [form, setForm] = useState<EntrepriseProfilePayload>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingPlan, setWorkingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const entreprise = overview?.entreprise || null;
  const activePlanCode = overview?.active_plan?.code || null;
  const pendingSubscription = overview?.pending_subscription || null;
  const pendingPlan = overview?.pending_plan || null;

  const paidPlans = useMemo(() => plans.filter(plan => plan.code !== 'ESSENTIEL'), [plans]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, plansData, usageData] = await Promise.all([
        entrepriseService.getOverview(),
        planService.getPlans(),
        planService.getMyUsage(),
      ]);
      setOverview(overviewData);
      setPlans(plansData);
      setUsageOverview(usageData);
      if (overviewData.entreprise) {
        setForm({
          ...emptyForm,
          ...overviewData.entreprise,
          date_creation_entreprise: overviewData.entreprise.date_creation_entreprise || '',
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: sanitizeApiErrorMessage(error, 'Impossible de charger les informations entreprise.') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (field: keyof EntrepriseProfilePayload, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const cleanPayload = () => Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, typeof value === 'string' && value.trim() === '' ? null : value])
  ) as EntrepriseProfilePayload;

  const handleSaveProfile = async () => {
    if (!form.nom.trim()) {
      setMessage({ type: 'error', text: "Le nom de l'entreprise est obligatoire." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (entreprise) {
        await entrepriseService.updateProfile(cleanPayload());
        setMessage({ type: 'success', text: 'Fiche entreprise mise a jour.' });
      } else {
        await entrepriseService.createProfile(cleanPayload());
        setMessage({ type: 'success', text: 'Fiche entreprise creee. Vous pouvez maintenant choisir un abonnement.' });
      }
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: sanitizeApiErrorMessage(error, 'Impossible de sauvegarder la fiche entreprise.') });
    } finally {
      setSaving(false);
    }
  };

  const handleStartSubscription = async (planCode: string) => {
    setWorkingPlan(planCode);
    setMessage(null);
    try {
      await entrepriseService.startSubscription(planCode);
      setMessage({ type: 'success', text: 'Abonnement initialise. Confirmez le paiement pour activer le plan.' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: sanitizeApiErrorMessage(error, "Impossible d'initialiser cet abonnement.") });
    } finally {
      setWorkingPlan(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingSubscription) return;
    setWorkingPlan(pendingSubscription.id_plan_abonnement);
    setMessage(null);
    try {
      await entrepriseService.confirmPayment(pendingSubscription.id, {
        mode_paiement: 'manuel',
        reference_transaction: `KP-${Date.now()}`,
      });
      setMessage({ type: 'success', text: 'Paiement confirme. Votre abonnement est actif.' });
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: sanitizeApiErrorMessage(error, 'Impossible de confirmer le paiement.') });
    } finally {
      setWorkingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-theme-main">Compte entreprise</h1>
              <p className="text-sm font-medium text-theme-muted">Identite officielle, abonnement et capacites de votre organisation.</p>
            </div>
          </div>
        </div>
        {overview?.active_subscription && overview.active_plan && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-300">
            Plan actif : {sanitizeText(overview.active_plan.nom)}
          </div>
        )}
      </div>

      {message && (
        <div className={`rounded-2xl border px-5 py-4 text-sm font-bold ${message.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600' : 'border-red-500/20 bg-red-500/10 text-red-500'}`}>
          {sanitizeText(message.text)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassCard className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-secondary" />
            <h2 className="text-xl font-black uppercase tracking-tight text-theme-main">Fiche entreprise</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Nom de l'entreprise</span>
              <input value={sanitizeText(sanitizeHtml(form.nom || ''))} onChange={e => handleChange('nom', e.target.value)} className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Description</span>
              <textarea value={form.description || ''} onChange={e => handleChange('description', e.target.value)} rows={3} className="w-full resize-none rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Statut juridique</span>
              <input value={form.statut_juridique || ''} onChange={e => handleChange('statut_juridique', e.target.value)} className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Telephone</span>
              <input value={form.telephone || ''} onChange={e => handleChange('telephone', e.target.value)} className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Adresse</span>
              <input value={form.adresse || ''} onChange={e => handleChange('adresse', e.target.value)} className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Numero IFU</span>
              <input value={form.numero_ifu || ''} onChange={e => handleChange('numero_ifu', e.target.value)} className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Numero RCCM</span>
              <input value={form.numero_rccm || ''} onChange={e => handleChange('numero_rccm', e.target.value)} className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Nom responsable</span>
              <input value={form.nom_responsable_entreprise || ''} onChange={e => handleChange('nom_responsable_entreprise', e.target.value)} className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Prenoms responsable</span>
              <input value={form.prenoms_responsable_entreprise || ''} onChange={e => handleChange('prenoms_responsable_entreprise', e.target.value)} className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Site web</span>
              <input value={form.site_web || ''} onChange={e => handleChange('site_web', e.target.value)} className="w-full rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3 text-theme-main outline-none focus:ring-2 focus:ring-secondary/20" />
            </label>
          </div>
          <div className="mt-6 flex sm:justify-end">
            <Button onClick={handleSaveProfile} loading={saving} className="w-full rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-[11px] sm:w-auto">
              {entreprise ? 'Mettre a jour' : 'Creer mon entreprise'}
            </Button>
          </div>
        </GlassCard>

        <div className="space-y-6">
          {usageOverview && (
            <GlassCard className="p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-secondary" />
                <h2 className="text-xl font-black uppercase tracking-tight text-theme-main">Usage du plan</h2>
              </div>
              <div className="mb-4 rounded-2xl border border-theme-border-subtle bg-theme-surface/60 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Plan actuel</p>
                <p className="mt-1 text-lg font-black text-theme-main">{usageOverview.plan.nom}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Workspaces', 'workspaces'],
                  ['Espaces', 'espaces'],
                  ['Projets', 'projets'],
                  ['Membres', 'membres'],
                ].map(([label, key]) => {
                  const limit = usageOverview.plan.limits[key as keyof typeof usageOverview.plan.limits];
                  const current = usageOverview.usage[key as keyof typeof usageOverview.usage];
                  return (
                    <div key={key} className="rounded-2xl border border-theme-border-subtle bg-theme-surface px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">{label}</p>
                      <p className="mt-1 text-xl font-black text-theme-main">
                        {current}
                        <span className="text-sm text-theme-muted"> / {limit ?? 'illimite'}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          <GlassCard className="p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-secondary" />
              <h2 className="text-xl font-black uppercase tracking-tight text-theme-main">Abonnement</h2>
            </div>
            {!entreprise ? (
              <p className="text-sm font-medium leading-relaxed text-theme-muted">Creez d'abord votre fiche entreprise pour activer un plan professionnel ou entreprise.</p>
            ) : pendingSubscription && pendingPlan ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                <p className="text-sm font-black uppercase tracking-widest text-amber-600">Paiement en attente</p>
                <p className="mt-2 text-theme-main font-bold">{pendingPlan.nom} - {formatMoney(overview?.latest_payment?.montant, overview?.latest_payment?.devise || 'XOF')}</p>
                <Button onClick={handleConfirmPayment} loading={Boolean(workingPlan)} className="mt-5 rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-widest">
                  Confirmer le paiement
                </Button>
              </div>
            ) : overview?.active_subscription && overview.active_plan ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Plan actif</p>
                <p className="mt-2 text-theme-main font-bold">{overview.active_plan.nom}</p>
                <p className="mt-1 text-sm text-theme-muted">Expire le {overview.active_subscription.date_fin ? new Date(overview.active_subscription.date_fin).toLocaleDateString('fr-FR') : 'non defini'}</p>
              </div>
            ) : (
              <p className="text-sm font-medium leading-relaxed text-theme-muted">Aucun abonnement actif pour le moment.</p>
            )}
          </GlassCard>

          <div className="grid grid-cols-1 gap-4">
            {paidPlans.map(plan => (
              <GlassCard key={plan.code} className={`p-5 ${plan.highlight ? 'border-secondary/40 bg-secondary/5' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black uppercase tracking-tight text-theme-main">{sanitizeText(plan.nom)}</h3>
                      {plan.highlight && <Sparkles className="h-4 w-4 text-secondary" />}
                    </div>
                    <p className="mt-1 text-sm text-theme-muted">{sanitizeText(plan.audience)}</p>
                    <p className="mt-3 text-2xl font-black text-theme-main">{plan.price_label}</p>
                  </div>
                  {activePlanCode === plan.code ? (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">Actif</span>
                  ) : (
                    <Button disabled={!entreprise || Boolean(workingPlan)} onClick={() => handleStartSubscription(plan.code)} className="rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                      Choisir
                    </Button>
                  )}
                </div>
                <ul className="mt-5 space-y-2">
                  {plan.features.slice(0, 5).map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-theme-muted">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary" />
                      <span>{sanitizeText(feature)}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
