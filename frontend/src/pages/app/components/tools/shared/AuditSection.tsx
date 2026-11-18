// frontend/src/pages/app/components/tools/shared/AuditSection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Filter, Search, Clock, User, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../../../../../components/ui/GlassCard';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  workspace_id?: string;
  espace_id?: string;
  ip_address?: string;
  status: string;
  details?: string;
}

interface AuditSectionProps {
  workspaceId?: string | null;
  espaceId?: string | null;
  listeId?: string | null;
}

const ACTION_LABELS: Record<string, { label: string; category: string }> = {
  // Absences
  CREATE_LEAVE_REQUEST: { label: "Demande d'absence/congé créée", category: "Absences" },
  APPROVE_LEAVE_REQUEST: { label: "Demande d'absence/congé approuvée", category: "Absences" },
  REJECT_LEAVE_REQUEST: { label: "Demande d'absence/congé rejetée", category: "Absences" },
  CANCEL_LEAVE_REQUEST: { label: "Demande d'absence/congé annulée", category: "Absences" },

  // Listes
  CREATE_LISTE: { label: "Création de projet/liste", category: "Listes" },
  UPDATE_LISTE: { label: "Modification de projet/liste", category: "Listes" },
  DELETE_LISTE: { label: "Suppression de projet/liste", category: "Listes" },
  ASSIGN_LISTE_MEMBER: { label: "Ajout d'un membre sur le projet", category: "Membres" },
  UNASSIGN_LISTE_MEMBER: { label: "Retrait d'un membre du projet", category: "Membres" },
  UPDATE_LISTE_MEMBER_ROLE: { label: "Changement de rôle membre", category: "Membres" },

  // Tâches
  CREATE_TACHE: { label: "Création de tâche", category: "Tâches" },
  UPDATE_TACHE: { label: "Modification de tâche", category: "Tâches" },
  DELETE_TACHE: { label: "Suppression de tâche", category: "Tâches" },
  REOPEN_TASK: { label: "Réouverture de tâche", category: "Tâches" },
  ASSIGN_TACHE_MEMBER: { label: "Assignation d'exécutant sur une tâche", category: "Tâches" },
  UNASSIGN_TACHE_MEMBER: { label: "Désassignation d'exécutant d'une tâche", category: "Tâches" },

  // Gouvernance
  UPDATE_ROLE: { label: "Changement de rôle", category: "Gouvernance" },
};

export const AuditSection: React.FC<AuditSectionProps> = ({
  workspaceId,
  espaceId,
  listeId,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/audit/logs?limit=200';
      if (listeId) {
        url += `&resource_id=${encodeURIComponent(listeId)}`;
      } else if (espaceId) {
        url += `&espace_id=${encodeURIComponent(espaceId)}`;
      } else if (workspaceId) {
        url += `&workspace_id=${encodeURIComponent(workspaceId)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Erreur chargement logs audit:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, espaceId, listeId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource_type || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'all' || log.action === filterAction;

    return matchesSearch && matchesAction;
  });

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête du journal d'audit */}
      <GlassCard className="p-6 border-theme-border-subtle bg-theme-surface/70">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-secondary/10 text-secondary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-theme-main flex items-center gap-2">
                Journal d'activités & Audit Trail (5W)
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Sécurisé RBAC
                </span>
              </h2>
              <p className="text-xs text-theme-muted mt-0.5">
                Traçabilité complète des actions importantes (Qui, Quoi, Quand, Où, Comment)
              </p>
            </div>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-theme-border-subtle bg-theme-surface-hover/50 hover:bg-theme-surface-hover text-xs font-bold text-theme-main transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-secondary' : ''}`} />
            Rafraîchir
          </button>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted/60" />
            <input
              type="text"
              placeholder="Rechercher par utilisateur, email, action ou ressource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-theme-border-subtle bg-theme-surface/50 text-xs text-theme-main focus:outline-none focus:border-secondary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-theme-muted shrink-0" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-theme-border-subtle bg-theme-surface/50 text-xs font-bold text-theme-main focus:outline-none focus:border-secondary"
            >
              <option value="all">Toutes les actions</option>
              <optgroup label="Projets & Listes">
                <option value="CREATE_LISTE">Création de projet/liste</option>
                <option value="UPDATE_LISTE">Modification de projet/liste</option>
                <option value="DELETE_LISTE">Suppression de projet/liste</option>
                <option value="ASSIGN_LISTE_MEMBER">Ajout de membre (Liste)</option>
                <option value="UNASSIGN_LISTE_MEMBER">Retrait de membre (Liste)</option>
                <option value="UPDATE_LISTE_MEMBER_ROLE">Changement de rôle membre</option>
              </optgroup>
              <optgroup label="Tâches">
                <option value="CREATE_TACHE">Création de tâche</option>
                <option value="UPDATE_TACHE">Modification de tâche</option>
                <option value="DELETE_TACHE">Suppression de tâche</option>
                <option value="ASSIGN_TACHE_MEMBER">Assignation d'exécutant</option>
                <option value="UNASSIGN_TACHE_MEMBER">Désassignation d'exécutant</option>
                <option value="REOPEN_TASK">Réouverture de tâche</option>
              </optgroup>
              <optgroup label="Absences & Congés">
                <option value="CREATE_LEAVE_REQUEST">Création de congé</option>
                <option value="APPROVE_LEAVE_REQUEST">Approbation de congé</option>
                <option value="REJECT_LEAVE_REQUEST">Rejet de congé</option>
                <option value="CANCEL_LEAVE_REQUEST">Annulation de congé</option>
              </optgroup>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Liste des entrées de log */}
      <div className="space-y-3">
        {loading ? (
          <GlassCard className="p-8 text-center border-theme-border-subtle">
            <RefreshCw className="h-6 w-6 animate-spin text-secondary mx-auto mb-2" />
            <p className="text-xs font-bold text-theme-muted">Chargement des entrées d'audit...</p>
          </GlassCard>
        ) : filteredLogs.length === 0 ? (
          <GlassCard className="p-8 text-center border-theme-border-subtle">
            <Activity className="h-8 w-8 text-theme-muted/40 mx-auto mb-2" />
            <p className="text-xs font-bold text-theme-muted">Aucune entrée d'audit enregistrée</p>
          </GlassCard>
        ) : (
          filteredLogs.map((log) => {
            const meta = ACTION_LABELS[log.action] || { label: log.action, category: log.resource_type };
            const isSuccess = log.status === 'SUCCESS';

            return (
              <GlassCard key={log.id} className="p-4 border-theme-border-subtle hover:border-secondary/20 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isSuccess ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-theme-main">
                          {meta.label}
                        </span>
                        {log.resource_name && (
                          <span className="text-xs font-bold text-secondary">
                            « {log.resource_name} »
                          </span>
                        )}
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-theme-surface-hover border border-theme-border-subtle text-theme-muted">
                          {log.resource_type}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-theme-muted">
                        <span className="flex items-center gap-1 font-bold text-theme-main">
                          <User className="h-3 w-3 text-secondary" />
                          {log.user_name || 'Système'} {log.user_email ? `(${log.user_email})` : ''}
                        </span>
                        {log.ip_address && (
                          <span className="opacity-60">IP: {log.ip_address}</span>
                        )}
                        <span className="flex items-center gap-1 opacity-75">
                          <Clock className="h-3 w-3" />
                          {formatDate(log.timestamp)}
                        </span>
                      </div>

                      {log.details && (
                        <p className="mt-1.5 text-[11px] italic text-theme-muted/80 bg-theme-surface-hover/30 p-2 rounded-lg border border-theme-border-subtle/50">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isSuccess ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
};
