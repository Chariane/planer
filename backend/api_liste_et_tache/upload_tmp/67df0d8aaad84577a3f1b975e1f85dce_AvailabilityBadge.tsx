// frontend/src/components/ui/AvailabilityBadge.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserAvailabilityOut } from '../../types';

interface AvailabilityBadgeProps {
    availability: UserAvailabilityOut | undefined;
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
}

// ✅ Fonction de formatage sécurisée avec fallback
const formatDate = (date?: string | null) => {
    if (!date) return null;
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return null;
    }
};

export const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({
    availability,
    size = 'md',
    showText = false
}) => {
    if (!availability) return null;

    const { is_available, current_absence } = availability;

    const getBadgeColor = () => {
        if (is_available) return 'bg-emerald-500';
        return 'bg-rose-500';
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm': return 'w-2 h-2';
            case 'lg': return 'w-4 h-4';
            default: return 'w-3 h-3';
        }
    };

    // ✅ Règle métier : si date_fin est null, on utilise date_debut
    const getEndDate = () => {
        if (!current_absence) return null;
        // Priorité à date_fin, sinon date_debut
        const endDate = current_absence.date_fin || current_absence.date_debut;
        return formatDate(endDate);
    };

    const endDate = getEndDate();

    const getTooltipText = () => {
        if (is_available) return 'Disponible';
        if (!current_absence) return 'Indisponible';
        const type = current_absence.is_absence ? 'Absence' : 'Congé';
        if (endDate) {
            return `${type} - Indisponible jusqu'au ${endDate}`;
        }
        return `${type} - Indisponible (date non définie)`;
    };

    // ✅ Texte affiché : juste "Disponible" ou "Indisponible" (sans date)
    const getStatusText = () => {
        if (is_available) return 'Disponible';
        return 'Indisponible';
    };

    return (
        <div className="flex items-center gap-2 group relative">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                    scale: 1,
                    opacity: 1,
                    boxShadow: !is_available ? [
                        '0 0 0 0px rgba(244, 63, 94, 0)',
                        '0 0 0 4px rgba(244, 63, 94, 0.4)',
                        '0 0 0 0px rgba(244, 63, 94, 0)'
                    ] : 'none'
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className={`${getSizeClasses()} rounded-full ${getBadgeColor()} shadow-sm ring-2 ring-white dark:ring-slate-900`}
                title={getTooltipText()}
            />

            {showText && (
                <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md ${is_available
                    ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-rose-600 bg-rose-500/10 border border-rose-500/20 animate-pulse'
                    }`}>
                    {getStatusText()}
                </span>
            )}

            {/* ✅ Tooltip on hover if absent - affiche la date de fin */}
            {!is_available && current_absence && (
                <AnimatePresence>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block transition-all z-50">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap max-w-[220px]"
                        >
                            <div className="font-bold">{current_absence.is_absence ? 'Absence' : 'Congé'}</div>
                            {endDate ? (
                                <div className="text-slate-300">Indisponible jusqu'au {endDate}</div>
                            ) : (
                                <div className="text-slate-300">Date de fin non définie</div>
                            )}
                            {current_absence.motif && (
                                <div className="text-slate-400 text-[9px] italic mt-0.5 truncate max-w-[180px]">
                                    "{current_absence.motif}"
                                </div>
                            )}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </motion.div>
                    </div>
                </AnimatePresence>
            )}
        </div>
    );
};