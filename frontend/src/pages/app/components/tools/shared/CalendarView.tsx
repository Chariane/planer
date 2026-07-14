// frontend/src/pages/app/components/tools/shared/CalendarView.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Users, Filter, X } from 'lucide-react';
import { GlassCard } from '../../../../../components/ui/GlassCard';
import { AvailabilityBadge } from '../../../../../components/ui/AvailabilityBadge';
import { StatusBadge } from './StatusBadge';

interface CalendarViewProps {
  absences: any[];
  listAvailability?: any[];
  currentUserId?: string | null;
  formatDate?: (date?: string | null) => string;
  getDurationDisplay?: (start: string, end?: string | null) => string;
  onViewAbsence?: (absence: any) => void;
  members?: any[];
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const CalendarView = ({
  absences,
  listAvailability = [],
  currentUserId,
  formatDate = (date) => date ? new Date(date).toLocaleDateString('fr-FR') : '—',
  getDurationDisplay = (start, end) => {
    const diffDays = Math.ceil((new Date(end || start).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays === 1 ? '1 jour' : `${diffDays} jours`;
  },
  onViewAbsence,
  members = [],
}: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Navigation
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calculer la semaine
  const weekStart = useMemo(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [currentDate]);

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [weekStart]);

  // Filtrer les absences de la semaine
  const weekAbsences = useMemo(() => {
    const filtered = absences.filter(absence => {
      // Filtrer par membre
      if (selectedMemberId && absence.owner_user_id !== selectedMemberId) {
        return false;
      }

      const start = new Date(absence.date_debut);
      const end = absence.date_fin ? new Date(absence.date_fin) : new Date(absence.date_debut);
      
      // Vérifier si l'absence chevauche la semaine
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      return start <= weekEnd && end >= weekStart;
    });
    return filtered;
  }, [absences, selectedMemberId, weekStart]);

  // Grouper les absences par jour
  const absencesByDay = useMemo(() => {
    const map = new Map();
    weekDates.forEach(date => {
      const key = date.toISOString().split('T')[0];
      map.set(key, []);
    });

    weekAbsences.forEach(absence => {
      const start = new Date(absence.date_debut);
      const end = absence.date_fin ? new Date(absence.date_fin) : new Date(absence.date_debut);
      
      weekDates.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const currentDate = new Date(date);
        currentDate.setHours(0, 0, 0, 0);
        
        const checkStart = new Date(start);
        checkStart.setHours(0, 0, 0, 0);
        const checkEnd = new Date(end);
        checkEnd.setHours(0, 0, 0, 0);
        
        if (currentDate >= checkStart && currentDate <= checkEnd) {
          const absences = map.get(dateKey) || [];
          // Éviter les doublons
          if (!absences.find((a: any) => a.id === absence.id)) {
            absences.push(absence);
            map.set(dateKey, absences);
          }
        }
      });
    });
    return map;
  }, [weekAbsences, weekDates]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
  };

  const isInPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const uniqueMembers = useMemo(() => {
    const memberMap = new Map();
    absences.forEach(absence => {
      if (absence.owner_user_id && !memberMap.has(absence.owner_user_id)) {
        const member = members.find(m => m.id_utilisateur === absence.owner_user_id);
        if (member) {
          memberMap.set(absence.owner_user_id, member);
        }
      }
    });
    return Array.from(memberMap.values());
  }, [absences, members]);

  return (
    <div className="space-y-6">
      {/* En-tête du calendrier */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-xl border border-theme-border-subtle hover:bg-theme-surface-hover transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-xl bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-widest hover:bg-secondary/20 transition-colors"
          >
            Aujourd'hui
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-xl border border-theme-border-subtle hover:bg-theme-surface-hover transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <h3 className="text-lg font-black text-theme-main ml-2">
            {weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
        </div>

        {/* Filtre par membre */}
        {uniqueMembers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="pl-10 pr-8 py-2 rounded-xl border border-theme-border-subtle bg-theme-surface text-sm font-black text-theme-main outline-none focus:ring-2 focus:ring-secondary/20 transition-all appearance-none"
              >
                <option value="">Tous les membres</option>
                {uniqueMembers.map((member: any) => (
                  <option key={member.id_utilisateur} value={member.id_utilisateur}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedMemberId && (
              <button
                onClick={() => setSelectedMemberId('')}
                className="p-2 rounded-xl border border-theme-border-subtle hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-2">
        {/* Jours de la semaine */}
        {DAYS_OF_WEEK.map((day, index) => {
          const date = weekDates[index];
          const isWeekend = index >= 5;
          const isTodayDate = isToday(date);
          const isPast = isInPast(date);

          return (
            <div key={day} className="space-y-1">
              {/* En-tête du jour */}
              <div className={`text-center p-2 rounded-xl ${isTodayDate ? 'bg-secondary text-white' : isWeekend ? 'text-theme-muted/50' : 'text-theme-muted'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest">{day}</p>
                <p className={`text-lg font-black ${isTodayDate ? 'text-white' : 'text-theme-main'}`}>
                  {date.getDate()}
                </p>
              </div>

              {/* Absences du jour */}
              <div className="min-h-[100px] space-y-1 p-1">
                <AnimatePresence mode="popLayout">
                  {(absencesByDay.get(date.toISOString().split('T')[0]) || []).map((absence: any, index: number) => {
                    const availability = listAvailability.find(
                      a => a.id_utilisateur === absence.owner_user_id
                    );
                    const isOwn = absence.owner_user_id === currentUserId;
                    const isOnGoing = new Date(absence.date_debut) <= new Date() && 
                                      (!absence.date_fin || new Date(absence.date_fin) >= new Date());

                    return (
                      <motion.div
                        key={absence.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onViewAbsence?.(absence)}
                        className={`p-2 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
                          isOnGoing 
                            ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50' 
                            : 'border-theme-border-subtle bg-theme-surface/50 hover:bg-theme-surface-hover/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <AvailabilityBadge availability={availability} size="sm" />
                            <span className={`text-[10px] font-black truncate ${isOwn ? 'text-secondary' : 'text-theme-main'}`}>
                              {absence.authorName || absence.owner_name || 'Utilisateur'}
                            </span>
                          </div>
                          {isOnGoing && (
                            <span className="text-[8px] font-black uppercase text-emerald-500 animate-pulse">
                              ● En cours
                            </span>
                          )}
                        </div>
                        <p className="text-[8px] text-theme-muted font-medium truncate">
                          {absence.is_absence ? 'Absence' : 'Congé'}
                          {absence.motif && ` · ${absence.motif}`}
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl border border-theme-border-subtle bg-theme-surface/30">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">En cours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">À venir</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gray-300" />
          <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">Terminée</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[9px] font-black text-theme-muted uppercase tracking-widest">
            {weekAbsences.length} absence(s) cette semaine
          </span>
        </div>
      </div>

      {/* Absences en détail (optionnel) */}
      {weekAbsences.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl border border-theme-border-subtle bg-theme-surface/20">
          <p className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3">Détail des absences de la semaine</p>
          <div className="space-y-2">
            {weekAbsences.map(absence => {
              const duration = getDurationDisplay(absence.date_debut, absence.date_fin);
              const isOnGoing = new Date(absence.date_debut) <= new Date() && 
                                (!absence.date_fin || new Date(absence.date_fin) >= new Date());

              return (
                <div key={absence.id} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-theme-border-subtle bg-theme-surface/50 hover:bg-theme-surface-hover/30 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <AvailabilityBadge 
                      availability={listAvailability.find(a => a.id_utilisateur === absence.owner_user_id)} 
                      size="sm" 
                    />
                    <span className="text-sm font-black text-theme-main truncate">
                      {absence.authorName || absence.owner_name || 'Utilisateur'}
                    </span>
                    <StatusBadge status={absence.statut} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-theme-muted shrink-0">
                    <span>{formatDate(absence.date_debut)} → {formatDate(absence.date_fin)}</span>
                    <span className="font-black">{duration}</span>
                    {isOnGoing && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black uppercase animate-pulse">
                        En cours
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message si aucune absence */}
      {weekAbsences.length === 0 && (
        <div className="py-16 text-center opacity-30 border-2 border-dashed border-theme-border-subtle rounded-3xl bg-theme-surface-hover/20">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-theme-muted" />
          <p className="font-black text-xs uppercase tracking-widest">Aucune absence cette semaine</p>
          <p className="text-[10px] text-theme-muted/50 mt-1">Tous les membres sont disponibles</p>
        </div>
      )}
    </div>
  );
};
