import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserAvailabilityOut } from '../../types';

interface AvailabilityBadgeProps {
    availability: UserAvailabilityOut | undefined;
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
}

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

    return (
        <div className="flex items-center gap-2 group relative">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`${getSizeClasses()} rounded-full ${getBadgeColor()} shadow-sm ring-2 ring-white dark:ring-slate-900`}
                title={is_available ? 'Disponible' : `Absent: ${current_absence?.motif || 'Sans motif'}`}
            />

            {showText && (
                <span className={`text-xs font-medium ${is_available ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {is_available ? 'Disponible' : 'Absent'}
                </span>
            )}

            {/* Tooltip on hover if absent */}
            {!is_available && current_absence && (
                <AnimatePresence>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block transition-all z-50">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap"
                        >
                            Indisponible jusqu'au {new Date(current_absence.date_fin).toLocaleDateString()}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                        </motion.div>
                    </div>
                </AnimatePresence>
            )}
        </div>
    );
};
