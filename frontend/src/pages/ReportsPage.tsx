import { useState, useEffect } from 'react';
import { sanitizeText, sanitizeHtml } from '../utils/sanitize';
import {
    FileText,
    Search,
    Plus,
    ChevronRight,
    TrendingUp,
    FileCheck,
    Clock,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { plannerToolsService } from '../services/plannerTools.service';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';

export default function ReportsPage() {
    const { user } = useAuth();
    const { listeId } = useParams<{ listeId: string }>();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');

    const fetchReports = async () => {
        setLoading(true);
        try {
            const data = await plannerToolsService.listReports({
                limit: 50,
                q: searchQuery || undefined,
                liste_id: listeId
            });
            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch reports", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchReports();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const stats = [
        { label: 'Rapports Totaux', value: reports.length, icon: FileText, color: 'text-primary' },
        { label: 'Céations Récentes', value: reports.filter(r => new Date(r.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length, icon: TrendingUp, color: 'text-emerald-500' },
        { label: 'En attente de revue', value: 0, icon: Clock, color: 'text-amber-500' },
        { label: 'Validés', value: reports.length, icon: FileCheck, color: 'text-primary-hover' },
    ];

    const displayedReports = activeTab === 'mine'
        ? reports.filter(report => report.owner_user_id === user?.id)
        : reports;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen pb-20">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                        Rapports d'Activité
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </h1>
                    <p className="text-theme-muted font-medium tracking-tight">Gérez vos réalisations et documentez votre progression.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un rapport..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 min-w-[300px] transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <GlassCard key={idx} className="p-6 border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <stat.icon size={64} />
                        </div>
                        <div className="space-y-4">
                            <div className={`h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-theme-muted uppercase tracking-[0.2em]">{stat.label}</p>
                                <p className="text-2xl font-black text-white tabular-nums">{loading ? '...' : sanitizeText(String(stat.value))}</p>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Tabs & Actions */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-8">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`text-sm font-black uppercase tracking-widest pb-4 transition-all relative ${activeTab === 'all' ? 'text-white' : 'text-theme-muted hover:text-white'}`}
                    >
                        Tous les rapports
                        {activeTab === 'all' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('mine')}
                        className={`text-sm font-black uppercase tracking-widest pb-4 transition-all relative ${activeTab === 'mine' ? 'text-white' : 'text-theme-muted hover:text-white'}`}
                    >
                        Mes rapports
                        {activeTab === 'mine' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
                    </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="secondary" className="h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest gap-2">
                        <Filter size={14} /> Filtrer
                    </Button>
                </div>
            </div>

            {/* Reports List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm font-black text-theme-muted uppercase tracking-widest">Synchronisation...</p>
                </div>
            ) : displayedReports.length === 0 ? (
                <GlassCard className="py-24 flex flex-col items-center justify-center text-center space-y-6 border-dashed border-white/10 italic">
                    <div className="h-20 w-20 rounded-3xl bg-white/5 flex items-center justify-center text-theme-muted/20">
                        <FileText size={40} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Historique Vierge</h3>
                        <p className="text-theme-muted max-w-sm font-medium">{sanitizeText('Vous n\'avez pas encore soumis de rapport d\'activité pour cette période.')}</p>
                    </div>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence mode="popLayout">
                        {displayedReports.map((report) => (
                            <motion.div
                                key={report.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <GlassCard className="p-6 flex items-center justify-between group hover:border-primary/30 transition-all duration-300">
                                    <div className="flex items-center gap-6">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform border border-primary/20">
                                            <FileText size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">{sanitizeText(report.titre)}</h4>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-theme-muted uppercase tracking-widest">
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-theme-muted font-medium line-clamp-1 max-w-2xl leading-relaxed">
                                                {report.realisations ? sanitizeText(report.realisations) : "Aucune réalisation détaillée renseignée."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden md:block px-4 border-r border-white/5">
                                            <p className="text-[9px] font-black text-theme-muted uppercase tracking-widest">Auteur</p>
                                            <p className="text-xs font-bold text-white italic">{sanitizeText(report.owner_name || 'Inconnu')}</p>
                                        </div>
                                        <button className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-theme-muted hover:text-white hover:bg-primary transition-all border border-transparent hover:shadow-lg hover:shadow-primary/20">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Floating Action Tip */}
            {!loading && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50">
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                        <Plus size={16} />
                    </div>
                    <p className="text-xs font-bold text-white">
                        {sanitizeText('Pour soumettre un rapport, utilisez le panneau Outils du Planer dans vos listes de tâches.')}
                    </p>
                </div>
            )}
        </div>
    );
}
