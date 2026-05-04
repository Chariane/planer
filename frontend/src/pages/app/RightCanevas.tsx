// frontend/src/pages/app/RightCanevas.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ChevronDown, ChevronRight, CheckCircle, Circle, Edit, X, 
  Target, Sparkles, Plus, Trash2, Save, AlertCircle, Loader2 
} from 'lucide-react';
import { canevasService, type EnhancedCanevas, type EnhancedChecklist } from '../../services/canevas.service';
import { sectionService } from '../../services/section.service';
import { checklistService } from '../../services/checklist.service';

export default function RightCanevas() {
  const { listId } = useParams();
  const [canevas, setCanevas] = useState<EnhancedCanevas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // États pour l'édition
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  
  // États pour l'ajout
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [addingChecklistToSection, setAddingChecklistToSection] = useState<string | null>(null);
  
  // États de chargement pour actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const calculateSectionProgress = (checklists: EnhancedChecklist[]): number => {
    if (checklists.length === 0) return 0;
    const checkedCount = checklists.filter(c => c.is_checked).length;
    return Math.round((checkedCount / checklists.length) * 100);
  };

  const loadCanevas = async () => {
    if (!listId) return;
    
    setLoading(true);
    setError(null);
    try {
      const canevasData = await canevasService.getEnhancedByListe(listId);
      setCanevas(canevasData);
      const expanded: Record<string, boolean> = {};
      canevasData.sections.forEach(section => {
        expanded[section.id] = true;
      });
      setExpandedSections(expanded);
    } catch (err: any) {
      console.error('Erreur chargement canevas:', err);
      setCanevas(null);
      setError('Impossible de charger le canevas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listId) {
      loadCanevas();
    }
  }, [listId]);

  const addSection = async () => {
    if (!newSectionTitle.trim() || !canevas) return;
    setActionLoading('add-section');
    try {
      await sectionService.create(canevas.id, { titre: newSectionTitle });
      await loadCanevas();
      setNewSectionTitle('');
      setIsAddingSection(false);
    } catch (err) {
      console.error('Erreur ajout section:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const updateSection = async (sectionId: string) => {
    if (!editingSectionTitle.trim()) return;
    setActionLoading(`section-${sectionId}`);
    try {
      await sectionService.update(sectionId, { titre: editingSectionTitle });
      await loadCanevas();
      setEditingSectionId(null);
      setEditingSectionTitle('');
    } catch (err) {
      console.error('Erreur modification section:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Supprimer cette section ? Toutes les checklists seront également supprimées.')) return;
    setActionLoading(`delete-section-${sectionId}`);
    try {
      await sectionService.delete(sectionId);
      await loadCanevas();
    } catch (err) {
      console.error('Erreur suppression section:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const addChecklist = async (sectionId: string) => {
    if (!newChecklistText.trim()) return;
    setActionLoading(`add-checklist-${sectionId}`);
    try {
      await checklistService.createInSection(sectionId, { texte: newChecklistText, is_checked: false });
      await loadCanevas();
      setNewChecklistText('');
      setAddingChecklistToSection(null);
    } catch (err) {
      console.error('Erreur ajout checklist:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleChecklist = async (checklist: EnhancedChecklist, sectionId: string) => {
    if (checklist.source !== 'manual') return;
    
    setActionLoading(`toggle-${checklist.id}`);
    try {
      await checklistService.update(checklist.id, { is_checked: !checklist.is_checked });
      await loadCanevas();
    } catch (err) {
      console.error('Erreur mise à jour checklist:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const updateChecklist = async (checklist: EnhancedChecklist, sectionId: string) => {
    if (!editingChecklistText.trim()) return;
    setActionLoading(`update-${checklist.id}`);
    try {
      await checklistService.update(checklist.id, { texte: editingChecklistText });
      await loadCanevas();
      setEditingChecklistId(null);
      setEditingChecklistText('');
    } catch (err) {
      console.error('Erreur modification checklist:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteChecklist = async (checklistId: string, sectionId: string) => {
    if (!confirm('Supprimer cet élément ?')) return;
    setActionLoading(`delete-${checklistId}`);
    try {
      await checklistService.delete(checklistId);
      await loadCanevas();
    } catch (err) {
      console.error('Erreur suppression checklist:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const deleteCanevas = async () => {
    if (!canevas || canevas.sections.length > 0) {
      alert('Supprimez d\'abord toutes les sections');
      return;
    }
    if (!confirm('Supprimer ce canevas ?')) return;
    setActionLoading('delete-canevas');
    try {
      await canevasService.delete(canevas.id);
      setCanevas(null);
    } catch (err) {
      console.error('Erreur suppression canevas:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-secondary text-white p-2 rounded-l-lg shadow-lg hover:bg-secondary/90 transition z-20"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col border-l border-gray-200 shadow-lg w-96">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" />
          <h2 className="font-semibold text-gray-800">
            {canevas?.liste_nom ? `Canevas de ${canevas.liste_nom}` : "Canevas"}
          </h2>
          {canevas && canevas.is_verrouille && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Verrouillé</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canevas && canevas.sections.length === 0 && (
            <button
              onClick={deleteCanevas}
              disabled={actionLoading === 'delete-canevas'}
              className="p-1 text-gray-400 hover:text-red-500 transition"
              title="Supprimer le canevas"
            >
              {actionLoading === 'delete-canevas' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-secondary animate-spin mb-2" />
            <p className="text-sm text-gray-500">Chargement du canevas...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mb-2" />
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={loadCanevas} className="mt-3 text-sm text-secondary hover:underline">
              Réessayer
            </button>
          </div>
        ) : !canevas ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500 mb-3">Aucun canevas disponible</p>
            <button onClick={loadCanevas} className="mt-3 text-sm text-secondary hover:underline">
              Réessayer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {canevas.sections.map((section) => {
              const progress = section.progress;
              const isExpanded = expandedSections[section.id] !== false;
              
              return (
                <div key={section.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition">
                    <button onClick={() => toggleSection(section.id)} className="flex items-center gap-2 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      {editingSectionId === section.id ? (
                        <input
                          type="text"
                          value={editingSectionTitle}
                          onChange={(e) => setEditingSectionTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && updateSection(section.id)}
                          className="text-sm font-medium text-gray-700 border rounded px-2 py-0.5 focus:ring-1 focus:ring-secondary"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-700">{section.titre}</span>
                      )}
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-secondary">{progress}%</span>
                      <div className="w-20 bg-gray-200 rounded-full h-1.5">
                        <div className="bg-secondary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      
                      {!canevas.is_verrouille && (
                        <>
                          {editingSectionId !== section.id && (
                            <button
                              onClick={() => {
                                setEditingSectionId(section.id);
                                setEditingSectionTitle(section.titre);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 transition"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {editingSectionId === section.id && (
                            <button
                              onClick={() => updateSection(section.id)}
                              disabled={actionLoading === `section-${section.id}`}
                              className="p-1 text-green-500 hover:text-green-600 transition"
                            >
                              {actionLoading === `section-${section.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={() => deleteSection(section.id)}
                            disabled={actionLoading?.startsWith('delete-section')}
                            className="p-1 text-gray-400 hover:text-red-500 transition"
                          >
                            {actionLoading === `delete-section-${section.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 space-y-2">
                      {section.checklists.map((checklist) => (
                        <div key={checklist.id} className="flex items-center gap-2 group">
                          {checklist.source === 'task' && (
                            <span className="text-xs text-blue-400 w-4" title={`Tâche: ${checklist.task_title}`}>📋</span>
                          )}
                          {checklist.source === 'manual' && (
                            <span className="text-xs text-gray-400 w-4" title="Checklist manuelle">✏️</span>
                          )}
                          
                          <button
                            onClick={() => toggleChecklist(checklist, section.id)}
                            disabled={canevas.is_verrouille || checklist.source !== 'manual' || actionLoading?.startsWith('toggle')}
                            className="flex-shrink-0"
                          >
                            {actionLoading === `toggle-${checklist.id}` ? (
                              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                            ) : checklist.is_checked ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-300 hover:text-gray-400" />
                            )}
                          </button>
                          
                          {editingChecklistId === checklist.id ? (
                            <input
                              type="text"
                              value={editingChecklistText}
                              onChange={(e) => setEditingChecklistText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && updateChecklist(checklist, section.id)}
                              className="flex-1 text-sm text-gray-600 border rounded px-2 py-0.5 focus:ring-1 focus:ring-secondary"
                              autoFocus
                            />
                          ) : (
                            <span className={`text-sm flex-1 ${checklist.is_checked ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                              {checklist.texte}
                            </span>
                          )}
                          
                          {!canevas.is_verrouille && checklist.source === 'manual' && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              {editingChecklistId !== checklist.id && (
                                <button
                                  onClick={() => {
                                    setEditingChecklistId(checklist.id);
                                    setEditingChecklistText(checklist.texte);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                              )}
                              {editingChecklistId === checklist.id && (
                                <button
                                  onClick={() => updateChecklist(checklist, section.id)}
                                  disabled={actionLoading === `update-${checklist.id}`}
                                  className="p-1 text-green-500 hover:text-green-600"
                                >
                                  {actionLoading === `update-${checklist.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                </button>
                              )}
                              <button
                                onClick={() => deleteChecklist(checklist.id, section.id)}
                                disabled={actionLoading === `delete-${checklist.id}`}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                {actionLoading === `delete-${checklist.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {!canevas.is_verrouille && (
                        <div className="mt-2">
                          {addingChecklistToSection === section.id ? (
                            <div className="flex items-center gap-2">
                              <Circle className="h-4 w-4 text-gray-300" />
                              <input
                                type="text"
                                placeholder="Nouvel élément de checklist..."
                                value={newChecklistText}
                                onChange={(e) => setNewChecklistText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addChecklist(section.id)}
                                className="flex-1 text-sm border-b border-gray-200 focus:border-secondary outline-none py-1"
                                autoFocus
                              />
                              <button
                                onClick={() => addChecklist(section.id)}
                                disabled={actionLoading === `add-checklist-${section.id}`}
                                className="text-secondary text-xs hover:underline"
                              >
                                {actionLoading === `add-checklist-${section.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ajouter'}
                              </button>
                              <button
                                onClick={() => setAddingChecklistToSection(null)}
                                className="text-gray-400 text-xs hover:text-gray-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingChecklistToSection(section.id)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-secondary transition"
                            >
                              <Plus className="h-3 w-3" /> Ajouter un élément
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {!canevas.is_verrouille && (
              <div className="mt-4 pt-2 border-t border-gray-100">
                {isAddingSection ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nom de la section (ex: Mois de Décembre, Semaine du 05/12, Lundi 05/12)"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSection()}
                      className="flex-1 text-sm border rounded-lg px-3 py-2 focus:ring-1 focus:ring-secondary"
                      autoFocus
                    />
                    <button
                      onClick={addSection}
                      disabled={actionLoading === 'add-section'}
                      className="px-3 py-2 bg-secondary text-white text-sm rounded-lg hover:bg-secondary/90 transition"
                    >
                      {actionLoading === 'add-section' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter'}
                    </button>
                    <button
                      onClick={() => setIsAddingSection(false)}
                      className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingSection(true)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-secondary transition w-full justify-center py-2 border border-dashed border-gray-200 rounded-lg"
                  >
                    <Plus className="h-4 w-4" /> Ajouter une section
                  </button>
                )}
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Les sections peuvent être des mois, semaines ou jours. Les checklists des tâches dont la date correspond seront automatiquement affichées.
                </p>
              </div>
            )}

            {canevas.sections.length === 0 && !canevas.is_verrouille && (
              <div className="text-center text-gray-400 text-sm py-8">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Créez votre première section</p>
                <p className="text-xs mt-1">Exemples: "Mois de Décembre", "Semaine du 05/12", "Lundi 05/12"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}