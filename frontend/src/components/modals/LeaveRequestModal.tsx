// frontend/src/components/modals/LeaveRequestModal.tsx
import { useState, useEffect } from 'react';
import {
    X,
    Calendar as CalendarIcon,
    MessageSquare,
    Info,
    Clock,
    AlertCircle,
    Umbrella
} from 'lucide-react';
import { motion } from 'framer-motion';
import { sanitizeText } from '../../utils/sanitize';
import { Button } from '../ui/Button';
import { absenceService } from '../../services/absence.service';
import { toast } from '../ui/Toast'; 

interface LeaveRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    workspaceId?: string | null;
}

export default function LeaveRequestModal({ isOpen, onClose, onSuccess }: LeaveRequestModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        date_debut: '',
        date_fin: '',
        motif: '',
        is_absence: false, 
        is_conge_planifie: true,
    });

    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (formData.date_debut && formData.date_fin) {
            const start = new Date(formData.date_debut);
            const end = new Date(formData.date_fin);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setDuration(diffDays > 0 ? diffDays : 0);
        } else {
            setDuration(0);
        }
    }, [formData.date_debut, formData.date_fin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await absenceService.create({
                ...formData,
                duree_demandee_en_jours: duration,
                is_conge_planifie: !formData.is_absence
            });
            toast.success(sanitizeText('Demande envoyée avec succès.'));
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Failed to submit leave request", error);
            toast.error(sanitizeText(error.message || "Une erreur est survenue lors de la demande."));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isAbsence = formData.is_absence;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-2 sm:items-center sm:p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative max-h-[94dvh] w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0a] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] sm:rounded-[40px]"
            >
                <div className="max-h-[94dvh] overflow-y-auto p-5 space-y-7 sm:p-10 sm:space-y-10">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <div className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center border transition-all duration-500 rotate-[-5deg] sm:h-14 sm:w-14 ${isAbsence ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/10' : 'bg-primary/10 text-primary border-primary/20 shadow-lg shadow-primary/10'}`}>
                                {isAbsence ? <AlertCircle size={24} /> : <Umbrella size={24} />}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight italic">
                                    {isAbsence ? 'Demander une Absence' : 'Planifier un Congé'}
                                </h2>
                                <p className="text-[10px] text-theme-muted font-black uppercase tracking-[0.3em]">
                                    {isAbsence ? 'Événement imprévu ou urgent' : 'Repos planifié & annuel'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-theme-muted hover:text-white transition-colors border border-white/5">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Type Switcher (Sleek UI) */}
                        <div className="bg-white/5 p-1 rounded-2xl flex items-center relative overflow-hidden border border-white/5">
                            <motion.div
                                className={`absolute h-[calc(100%-8px)] rounded-xl ${isAbsence ? 'bg-amber-500' : 'bg-primary'}`}
                                animate={{
                                    x: isAbsence ? 'calc(100% + 4px)' : '4px',
                                    width: 'calc(50% - 6px)'
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, is_absence: false })}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest relative z-10 transition-colors duration-300 ${!isAbsence ? 'text-white' : 'text-theme-muted hover:text-white'}`}
                            >
                                Congé
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, is_absence: true })}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest relative z-10 transition-colors duration-300 ${isAbsence ? 'text-white' : 'text-theme-muted hover:text-white'}`}
                            >
                                Absence
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2 px-1">
                                    <CalendarIcon size={14} className={isAbsence ? 'text-amber-500' : 'text-primary'} /> {sanitizeText('Date de Début')}
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date_debut}
                                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                                    className={`w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none transition-all ${isAbsence ? 'focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5' : 'focus:border-primary/50 focus:ring-4 focus:ring-primary/5'}`}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2 px-1">
                                    <CalendarIcon size={14} className={isAbsence ? 'text-amber-500' : 'text-primary'} /> {sanitizeText('Date de Fin')}
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date_fin}
                                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                                    className={`w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none transition-all ${isAbsence ? 'focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5' : 'focus:border-primary/50 focus:ring-4 focus:ring-primary/5'}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2 px-1">
                                <MessageSquare size={14} className={isAbsence ? 'text-amber-500' : 'text-primary'} /> {sanitizeText('Motif & Justification')}
                            </label>
                            <textarea
                                placeholder={isAbsence ? sanitizeText("Ex: Maladie, urgence familiale, panne technique...") : sanitizeText("Ex: Vacances d'été, voyage prévu...")}
                                required
                                value={formData.motif}
                                onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                                className={`w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white min-h-[120px] focus:outline-none transition-all resize-none ${isAbsence ? 'focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5' : 'focus:border-primary/50 focus:ring-4 focus:ring-primary/5'}`}
                            />
                        </div>

                        <div className={`p-4 sm:p-6 rounded-3xl border flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-colors duration-500 ${isAbsence ? 'bg-amber-500/5 border-amber-500/10' : 'bg-primary/5 border-primary/10'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors duration-500 ${isAbsence ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted">{sanitizeText('Durée Estimée')}</p>
                                    <p className="text-lg font-black text-white italic">{duration} {sanitizeText('Jours Ouvrés')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg transition-all duration-500 ${isAbsence ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-primary text-white shadow-primary/20'}`}>
                                    {isAbsence ? sanitizeText('Impact Urgent') : sanitizeText('Période Validée')}
                                </span>
                            </div>
                        </div>

                        <div className="pt-4 sm:pt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <Button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || duration <= 0}
                                className={`flex-1 text-white h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:grayscale ${isAbsence ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' : 'bg-primary hover:bg-primary-hover shadow-primary/30'}`}
                            >
                                {loading ? sanitizeText('Soumission...') : (isAbsence ? sanitizeText('Demander l\'Absence') : sanitizeText('Confirmer le Congé'))}
                            </Button>
                        </div>
                    </form>
                </div>

                <div className="bg-white/[0.02] p-4 sm:p-6 flex items-start gap-4 border-t border-white/5">
                    <Info className="text-primary shrink-0" size={20} />
                    <p className="text-[11px] text-theme-muted font-medium leading-relaxed">
                        {isAbsence
                            ? sanitizeText("Votre demande d'absence sera soumise pour validation. Une fois approuvée, elle informera votre équipe pour permettre une redistribution des tâches.")
                            : sanitizeText("Votre demande de congé sera transmise à votre responsable. Une fois approuvée, elle apparaîtra au planning pour assurer la continuité.")}
                    </p>
                </div>

                {/* Le composant Toast local a été supprimé car nous utilisons l'API globale via toast.error() et toast.success() */}
            </motion.div>
        </div>
    );
}