// frontend/src/pages/AbsencesPage.tsx
import { useState, useEffect, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    Clock,
    CheckCircle2,
    Plus,
    Users,
    AlertTriangle,
    History,
    Plane,
    ShieldCheck,
    ChevronRight,
    TrendingDown,
    LayoutDashboard,
    Umbrella,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { absenceService, type AbsenceEtConge } from '../services/absence.service';
import type { AbsenceCalendarOut } from '../types';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { useApp } from '../contexts/AppContext';
import { LeaveRequestModal } from '../components/modals';

type TabType = 'dashboard' | 'my-requests' | 'team-calendar';

export default function AbsencesPage() {
    const { activeWorkspaceId } = useApp();
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<AbsenceEtConge[]>([]);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeWorkspaceId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await absenceService.list({ workspace_id: activeWorkspaceId });
            setRequests(data);
        } catch (error) {
            console.error("Erreur lors de la récupération des absences", error);
        } finally {
            setLoading(false);
        }
    };

    // Statistiques calculées à la volée (Approche Optimale sans modification de Modèle)
    const stats = useMemo(() => {
        const approved = requests.filter(r => r.statut === 'Accepté' || r.statut === 'Effectué');
        const totalDays = approved.reduce((acc, r) => acc + (r.duree_demandee_en_jours || 0), 0);
        const pending = requests.filter(r => r.statut === 'En attente').length;

        return {
            daysTaken: totalDays,
            pendingCount: pending,
            upcomingCount: approved.filter(r => new Date(r.date_debut) > new Date()).length
        };
    }, [requests]);

    const getStatusTheme = (status: string, isAbsence: boolean) => {
        if (isAbsence) {
            switch (status) {
                case 'Accepté': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
                case 'Refusé': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
                case 'En attente': return 'text-amber-500 bg-amber-500/20 border-amber-500/30';
                default: return 'text-theme-muted bg-theme-muted/10 border-theme-muted/20';
            }
        }
        switch (status) {
            case 'Accepté':
            case 'Effectué': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'Refusé': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
            case 'En attente': return 'text-primary bg-primary/10 border-primary/20';
            default: return 'text-theme-muted bg-theme-muted/10 border-theme-muted/20';
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-xl shadow-primary/10">
                            <Plane size={28} className="rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-4xl font-black tracking-tight text-white">Gestion du Temps</h1>
                                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-theme-muted uppercase tracking-widest">Enterprise</span>
                            </div>
                            <p className="text-theme-muted font-medium mt-1">Coordination des absences et optimisation de la charge d'équipe</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsRequestModalOpen(true)}
                        className="bg-primary hover:bg-primary-hover text-white shadow-xl shadow-primary/20 h-12 px-8 rounded-2xl flex items-center gap-3 group transition-all duration-300 hover:scale-[1.02]"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-bold tracking-tight">Soumettre une Demande</span>
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs (Glassmorphism) */}
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-[22px] w-fit border border-white/5 backdrop-blur-md">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'my-requests', label: 'Historique', icon: History },
                    { id: 'team-calendar', label: 'Planning Équipe', icon: CalendarIcon }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-100'
                            : 'text-theme-muted hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        {/* Dynamic Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <GlassCard className="p-8 relative group overflow-hidden border-emerald-500/10">
                                <div className="absolute -right-4 -bottom-4 text-emerald-500/5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                    <TrendingDown size={120} />
                                </div>
                                <div className="space-y-6">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <CheckCircle2 size={22} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-4xl font-black text-white italic">{stats.daysTaken}<span className="text-lg ml-1 font-bold text-theme-muted not-italic">j</span></h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Congés Consommés</p>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8 relative group overflow-hidden border-amber-500/10">
                                <div className="absolute -right-4 -bottom-4 text-amber-500/5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                    <Clock size={120} />
                                </div>
                                <div className="space-y-6">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <Clock size={22} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-4xl font-black text-white italic">{stats.pendingCount}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Demandes en attente</p>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8 relative group overflow-hidden border-primary/10">
                                <div className="absolute -right-4 -bottom-4 text-primary/5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                    <Plane size={120} />
                                </div>
                                <div className="space-y-6">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <CalendarIcon size={22} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-4xl font-black text-white italic">{stats.upcomingCount}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Départs Prévisibles</p>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8 bg-gradient-to-br from-primary to-primary-hover border-none shadow-2xl shadow-primary/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-20">
                                    <ShieldCheck size={40} className="text-white" />
                                </div>
                                <div className="h-full flex flex-col justify-between space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="text-white font-black text-sm uppercase tracking-tighter">Votre Quota de 25j</h4>
                                        <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden border border-white/10">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(stats.daysTaken / 25) * 100}%` }}
                                                className="h-full bg-white shadow-lg shadow-white/50"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-white/80 font-bold leading-tight">
                                        Basé sur votre politique entreprise standard.
                                    </p>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Risk Analysis View (The "Ideal" View) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <GlassCard className="lg:col-span-2 p-8 border-white/10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                            <AlertTriangle className="text-amber-500" size={24} />
                                            Détection Automatique de Risques
                                        </h3>
                                        <p className="text-sm text-theme-muted font-medium">Conflits potentiels entre vos absences et vos échéances de tâches.</p>
                                    </div>
                                    <div className="h-10 px-4 rounded-xl bg-white/5 flex items-center text-[10px] font-black uppercase tracking-widest text-theme-muted border border-white/5">
                                        Analyse en Temps Réel
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {stats.upcomingCount === 0 ? (
                                        <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                                            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center text-emerald-400 mb-4 border border-emerald-400/20">
                                                <ShieldCheck size={32} />
                                            </div>
                                            <h4 className="text-white font-bold italic">Aucun risque détecté</h4>
                                            <p className="text-xs text-theme-muted max-w-xs uppercase font-black tracking-tighter mt-1">Vos prochaines absences sont claires d'échéances critiques.</p>
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                                                    <Users size={20} />
                                                </div>
                                                <div className="space-y-1">
                                                    <h5 className="font-bold text-white uppercase text-xs tracking-tight">Conseil d'Expert</h5>
                                                    <p className="text-xs text-amber-500/80 leading-relaxed font-medium">
                                                        Pensez à déléguer vos tâches en cours via le motif de votre absence ou informez votre équipe des deadlines proches.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8 border-white/10 bg-white/[0.02]">
                                <h3 className="text-lg font-black text-white tracking-tight mb-6 flex items-center gap-2">
                                    <TrendingDown size={20} className="text-primary" />
                                    Résumé Mensuel
                                </h3>
                                <div className="space-y-6">
                                    {[
                                        { month: 'Janvier', count: 2, status: 'Completed' },
                                        { month: 'Février', count: 0, status: 'Upcoming' },
                                        { month: 'Mars', count: 5, status: 'Pending' }
                                    ].map((m, i) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-150 transition-all" />
                                                <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">{m.month}</span>
                                            </div>
                                            <span className="text-xs font-black text-theme-muted italic">{m.count} j</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-10 pt-6 border-t border-white/5">
                                    <button className="w-full h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest gap-2 transition-all">
                                        Exporter mon planning (PDF)
                                    </button>
                                </div>
                            </GlassCard>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'my-requests' && (
                    <motion.div
                        key="my-requests"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid gap-4"
                    >
                        {requests.length === 0 ? (
                            <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center text-theme-muted/20 border border-white/5">
                                    <History size={48} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-white italic">Historique Vierge</h3>
                                    <p className="text-sm text-theme-muted max-w-sm font-medium uppercase tracking-tighter">C'est le moment idéal pour planifier votre prochain repos mérité.</p>
                                </div>
                            </div>
                        ) : (
                            requests.map((req) => (
                                <GlassCard key={req.id} className={`p-6 flex items-center justify-between group transition-all duration-300 hover:translate-x-1 ${req.is_absence ? 'hover:border-amber-500/40' : 'hover:border-primary/40'}`}>
                                    <div className="flex items-center gap-6">
                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-transform group-hover:scale-105 ${getStatusTheme(req.statut, req.is_absence)}`}>
                                            {req.is_absence ? (
                                                <AlertCircle size={28} />
                                            ) : (
                                                <Umbrella size={28} />
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-4">
                                                <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">{req.motif || (req.is_absence ? 'Absence urgente' : 'Congé planifié')}</h4>
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-[0.2em] shadow-sm ${getStatusTheme(req.statut, req.is_absence)}`}>
                                                    {req.is_absence ? 'Absence' : 'Congé'} • {req.statut}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-5 text-[11px] text-theme-muted font-bold uppercase tracking-tight">
                                                <span className="flex items-center gap-2 text-white/50"><CalendarIcon size={14} className={req.is_absence ? 'text-amber-500' : 'text-primary'} /> du {new Date(req.date_debut).toLocaleDateString()} au {new Date(req.date_fin).toLocaleDateString()}</span>
                                                <div className="h-1 w-1 rounded-full bg-white/20" />
                                                <span className="flex items-center gap-2 font-black text-white/80">{req.duree_demandee_en_jours} Jours</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden md:block">
                                            <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Soumis le</p>
                                            <p className="text-xs font-bold text-white">{new Date(req.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <button className={`h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-theme-muted transition-all border border-transparent ${req.is_absence ? 'group-hover:text-white group-hover:bg-amber-500/20 group-hover:border-amber-500/30' : 'group-hover:text-white group-hover:bg-primary/20 group-hover:border-primary/30'}`}>
                                            <ChevronRight size={22} />
                                        </button>
                                    </div>
                                </GlassCard>
                            ))
                        )}
                    </motion.div>
                )}

                {activeTab === 'team-calendar' && (
                    <motion.div
                        key="team-calendar"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="min-h-[500px]"
                    >
                        <GlassCard className="h-[600px] flex flex-col items-center justify-center text-center space-y-8 border-white/5 p-12">
                            <div className="relative">
                                <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                                <div className="h-24 w-24 rounded-[32px] bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white relative shadow-2xl shadow-primary/40">
                                    <CalendarIcon size={48} />
                                </div>
                            </div>
                            <div className="space-y-3 max-w-xl">
                                <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase whitespace-pre-line">Le Radar de Visibilité{'\n'}d'Équipe Pro</h3>
                                <p className="text-theme-muted font-medium text-lg leading-relaxed">
                                    Affichez les congés et absences validés pour anticiper les besoins, déléguer intelligemment et assurer la continuité du service.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase text-theme-muted">Janvier 2026</div>
                                <div className="px-6 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase shadow-lg shadow-primary/20">Février 2026</div>
                                <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase text-theme-muted">Mars 2026</div>
                            </div>
                            <div className="grid grid-cols-7 gap-3 w-full max-w-4xl mt-8">
                                {Array.from({ length: 28 }).map((_, i) => (
                                    <div key={i} className={`h-12 rounded-xl border border-white/5 flex items-center justify-center text-[10px] font-bold ${i === 12 ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110 relative z-10' : 'bg-white/5 text-theme-muted opacity-40 italic'}`}>
                                        {i + 1}
                                        {i === 12 && <div className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full border-2 border-primary" />}
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            <LeaveRequestModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                onSuccess={fetchData}
                workspaceId={activeWorkspaceId}
            />

            {loading && (
                <div className="fixed bottom-10 right-10 flex items-center gap-3 bg-primary/20 backdrop-blur-xl border border-primary/30 px-5 py-3 rounded-2xl shadow-2xl z-50">
                    <div className="h-2 w-2 bg-primary rounded-full animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Synchronisation Cloud...</span>
                </div>
            )}
        </div>
    );
}
