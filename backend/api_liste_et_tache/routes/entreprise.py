from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_active_entreprise, get_access_token_from_request
from ..core.function import (
    LISTE_MEMBER_ROLE,
    _get_workspace_or_404,
    _require_attachment_target_read_access,
    _require_workspace_management_access,
    _get_workspace_member_or_403,
    _get_espace_or_404,
    _require_espace_read_access,
    _require_espace_descendant_read_access,
    _require_espace_management_access,
    _get_liste_or_404,
    _get_liste_member_record,
    _get_list_member_management_grant,
    _require_list_admin_access,
    _require_list_delete_access,
    _require_list_member_management_access,
    _require_list_read_access,
    _get_tache_or_404,
    _require_task_management_access,
    _require_task_read_access,
    _validate_list_member_management_permissions,
    _require_workspace_descendant_read_access,
)
from ..crud.fichier import (
    create_file_attachment,
    create_file_share_token,
    delete_file_attachment,
    get_file_by_id,
    list_accessible_files,
    resolve_file_share_token,
    update_file_attachment,
)
from ..crud.rapport import (
    create_report,
    delete_report,
    get_report,
    list_accessible_reports,
    update_report,
)
from ..crud.absence import (
    approve_leave,
    cancel_leave,
    create_leave_request,
    delete_absence,
    finish_leave,
    get_absence,
    get_absence_conflicts,
    get_team_calendar,
    get_user_availability,
    list_accessible_absences,
    reject_leave,
    update_absence,
)
from ..crud.liste import (
    assign_member_to_liste,
    create_liste,
    delete_liste,
    get_liste_by_id,
    get_liste_members,
    get_listes_for_espace,
    get_listes_for_workspace,
    unassign_member_from_liste,
    update_liste
)
from ..crud.tache import (
    create_tache,
    delete_tache,
    get_taches_for_liste,
    update_tache,
    assign_member_to_tache,
    unassign_member_from_tache,
    get_tache_members,
    get_taches_kanban,
    update_taches_bulk
)
from ..crud.search import (
    global_search,
    search_checklists,
    search_espaces,
    search_files,
    search_lists,
    search_members,
    search_sections,
    search_tasks,
)
from ..models import Tache

from ..schemas import (
    FichierAttachmentCreate,
    FichierOut,
    FichierShareCreate,
    FichierShareOut,
    FichierUpdate,
    RapportCreate,
    RapportOut,
    RapportUpdate,
    AbsenceConflictOut,
    AbsenceDecisionRequest,
    AbsenceEtCongeCreate,
    AbsenceEtCongeOut,
    AbsenceEtCongeUpdate,
    AbsenceCalendarOut,
    ListeCreate, ListeOut, ListeUpdate,
    TacheCreate, TacheOut, TacheUpdate,
    MembreOut, UtilisateurOut,
    TacheFullOut, TacheKanbanOut, TacheBulkUpdate, MessageResponse,
    CanevasOut, CanevasCreate, CanevasUpdate,
    SectionOut, SectionCreate, SectionUpdate,
    ChecklistOut, ChecklistCreate, ChecklistUpdate
)
from ..crud.checklist_canevas import (
    create_canevas, get_canevas_for_liste, update_canevas, delete_canevas, get_canevas_by_id,
    create_section, get_sections_for_canevas, update_section, delete_section, get_section_by_id,
    create_checklist, get_checklists_for_section, get_checklists_for_tache, update_checklist, delete_checklist, get_checklist_by_id
)

router = APIRouter(prefix="/entreprise/listes", tags=["Entreprise Listes & Tâches"])


def _can_read_liste_silently(db: Session, liste_id: str, user_id: str) -> bool:
    try:
        _require_list_read_access(db, liste_id, user_id)
        return True
    except HTTPException:
        return False


def _validate_search_scope(
    db: Session,
    user_id: str,
    *,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
) -> None:
    if workspace_id:
        _require_workspace_descendant_read_access(db, workspace_id, user_id)
    if espace_id:
        _require_espace_descendant_read_access(db, espace_id, user_id)
    if liste_id:
        _require_list_read_access(db, liste_id, user_id)
    if tache_id:
        _require_task_read_access(db, tache_id, user_id)


# -----------------------------------------------------------------------------
# LISTES
# -----------------------------------------------------------------------------


@router.post("", response_model=ListeOut, status_code=status.HTTP_201_CREATED)
def create_entreprise_liste_endpoint(
    liste_in: ListeCreate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
    token: Optional[str] = Depends(get_access_token_from_request)
):
    """Créer une liste (contexte entreprise)."""
    if liste_in.id_workspace:
        _get_workspace_or_404(db, liste_in.id_workspace)
        _require_workspace_management_access(db, liste_in.id_workspace, current_entreprise.id)
    else:
        _require_espace_management_access(db, liste_in.id_espace, current_entreprise.id)
        
    return create_liste(
        db, 
        nom=liste_in.nom, 
        description=liste_in.description, 
        id_espace=liste_in.id_espace, 
        id_workspace=liste_in.id_workspace,
        creator_user_id=current_entreprise.id,
        token=token,
    )

@router.get("", response_model=List[ListeOut])
def get_entreprise_listes_endpoint(
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    if (workspace_id is None) == (espace_id is None):
        raise HTTPException(status_code=400, detail="Specifiez soit workspace_id, soit espace_id")
    
    if workspace_id:
        try:
            _require_workspace_descendant_read_access(db, workspace_id, current_entreprise.id)
        except HTTPException:
            return [
                liste
                for liste in get_listes_for_workspace(db, workspace_id)
                if _can_read_liste_silently(db, liste.id, current_entreprise.id)
            ]
        return get_listes_for_workspace(db, workspace_id)
    else:
        _require_espace_descendant_read_access(db, espace_id, current_entreprise.id)
        return get_listes_for_espace(db, espace_id)

@router.get("/{liste_id}", response_model=ListeOut)
def get_entreprise_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_read_access(db, liste_id, current_entreprise.id)
    return _get_liste_or_404(db, liste_id)

@router.put("/{liste_id}", response_model=ListeOut)
def update_entreprise_liste_endpoint(
    liste_id: str,
    liste_in: ListeUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
    token: Optional[str] = Depends(get_access_token_from_request)
):
    _require_list_admin_access(db, liste_id, current_entreprise.id)
    return update_liste(db, liste_id, token=token, **liste_in.model_dump(exclude_unset=True))

@router.delete("/{liste_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entreprise_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_delete_access(db, liste_id, current_entreprise.id)
    delete_liste(db, liste_id)
    return None


@router.post("/{liste_id}/assign/{utilisateur_id}", response_model=MembreOut)
def assign_entreprise_liste_endpoint(
    liste_id: str,
    utilisateur_id: str,
    role: str = LISTE_MEMBER_ROLE,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
    token: Optional[str] = Depends(get_access_token_from_request)
):
    _require_list_member_management_access(db, liste_id, current_entreprise.id)
    _, actor_role, actor_source_type, actor_source_id = _get_list_member_management_grant(
        db, liste_id, current_entreprise.id
    )
    _validate_list_member_management_permissions(
        liste_id=liste_id,
        actor_role=actor_role,
        actor_source_type=actor_source_type,
        actor_source_id=actor_source_id,
        target_member=_get_liste_member_record(db, liste_id, utilisateur_id),
        new_role=role,
    )
    return assign_member_to_liste(db, liste_id, utilisateur_id, role, token=token)


@router.delete("/{liste_id}/unassign/{utilisateur_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_entreprise_liste_endpoint(
    liste_id: str,
    utilisateur_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
    token: Optional[str] = Depends(get_access_token_from_request)
):
    _require_list_member_management_access(db, liste_id, current_entreprise.id)
    target_member = _get_liste_member_record(db, liste_id, utilisateur_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    _, actor_role, actor_source_type, actor_source_id = _get_list_member_management_grant(
        db, liste_id, current_entreprise.id
    )
    _validate_list_member_management_permissions(
        liste_id=liste_id,
        actor_role=actor_role,
        actor_source_type=actor_source_type,
        actor_source_id=actor_source_id,
        target_member=target_member,
    )
    unassign_member_from_liste(db, liste_id, utilisateur_id, token=token)
    return None


@router.get("/{liste_id}/members", response_model=List[MembreOut])
def get_entreprise_liste_members_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_member_management_access(db, liste_id, current_entreprise.id)
    return get_liste_members(db, liste_id)

# -----------------------------------------------------------------------------
# TACHES
# -----------------------------------------------------------------------------

@router.post("/{liste_id}/taches", response_model=TacheOut, status_code=status.HTTP_201_CREATED)
def create_entreprise_tache_endpoint(
    liste_id: str,
    tache_in: TacheCreate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_admin_access(db, liste_id, current_entreprise.id)
    return create_tache(db, **tache_in.model_dump(exclude={"id_liste"}), id_liste=liste_id)

@router.get("/{liste_id}/taches", response_model=List[TacheFullOut])
def get_entreprise_taches_endpoint(
    liste_id: str,
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    membre_id: Optional[str] = None,
    sort_by: str = "ordre_affichage",
    order: str = "asc",
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_read_access(db, liste_id, current_entreprise.id)
    return get_taches_for_liste(
        db, liste_id, 
        statut=statut, 
        priorite=priorite, 
        membre_id=membre_id, 
        sort_by=sort_by, 
        order=order
    )

@router.put("/taches/{tache_id}", response_model=TacheOut)
def update_entreprise_tache_endpoint(
    tache_id: str,
    tache_in: TacheUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_task_management_access(db, tache_id, current_entreprise.id)
    return update_tache(db, tache_id, **tache_in.model_dump(exclude_unset=True))

@router.delete("/taches/{tache_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entreprise_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_admin_access(db, tache.id_liste, current_entreprise.id)
    delete_tache(db, tache_id)
    return None

# --- VUES ---

@router.get("/{liste_id}/vues/kanban", response_model=TacheKanbanOut)
def get_entreprise_kanban_view_endpoint(
    liste_id: str, 
    db: Session = Depends(get_db), 
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_read_access(db, liste_id, current_entreprise.id)
    return {"columns": get_taches_kanban(db, liste_id)}

@router.get("/{liste_id}/vues/gantt", response_model=List[TacheFullOut])
def get_entreprise_gantt_view_endpoint(
    liste_id: str, 
    db: Session = Depends(get_db), 
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_read_access(db, liste_id, current_entreprise.id)
    # Tri chronologique pour le diagramme de Gantt
    return get_taches_for_liste(db, liste_id, sort_by="date_debut", order="asc")

@router.get("/{liste_id}/vues/tableau", response_model=List[TacheFullOut])
def get_entreprise_tableau_view_endpoint(
    liste_id: str, 
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    membre_id: Optional[str] = None,
    sort_by: str = "ordre_affichage",
    order: str = "asc",
    db: Session = Depends(get_db), 
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_read_access(db, liste_id, current_entreprise.id)
    return get_taches_for_liste(
        db, liste_id, 
        statut=statut, 
        priorite=priorite, 
        membre_id=membre_id, 
        sort_by=sort_by, 
        order=order
    )

@router.patch("/taches/bulk", response_model=MessageResponse)
def bulk_update_entreprise_taches_endpoint(
    bulk_in: TacheBulkUpdate, 
    db: Session = Depends(get_db), 
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    if not bulk_in.items:
        return {"message": "Aucune modification fournie"}
    
    # Sécurité : On vérifie l'accès sur la première tâche du lot
    first_tache = _get_tache_or_404(db, bulk_in.items[0].id)
    _require_list_admin_access(db, first_tache.id_liste, current_entreprise.id)
    
    if update_taches_bulk(db, [it.model_dump(exclude_unset=True) for it in bulk_in.items]):
        return {"message": "Mise à jour groupée réussie"}
    else:
        raise HTTPException(status_code=400, detail="Échec de la mise à jour groupée")

# --- Assignations ---

@router.post("/taches/{tache_id}/assign/{utilisateur_id}", response_model=MembreOut)
def assign_entreprise_tache_endpoint(
    tache_id: str,
    utilisateur_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_admin_access(db, tache.id_liste, current_entreprise.id)
    return assign_member_to_tache(db, tache_id, utilisateur_id)

@router.delete("/taches/{tache_id}/unassign/{utilisateur_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_entreprise_tache_endpoint(
    tache_id: str,
    utilisateur_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_admin_access(db, tache.id_liste, current_entreprise.id)
    unassign_member_from_tache(db, tache_id, utilisateur_id)
    return None

# -----------------------------------------------------------------------------
# CANEVAS, SECTIONS, CHECKLISTS
# -----------------------------------------------------------------------------

@router.post("/{liste_id}/canevas", response_model=CanevasOut)
def create_entreprise_canevas_endpoint(liste_id: str, canevas_in: CanevasCreate, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    _require_list_admin_access(db, liste_id, current_entreprise.id)
    return create_canevas(db, is_verrouille=canevas_in.is_verrouille, id_liste=liste_id)

@router.get("/{liste_id}/canevas", response_model=CanevasOut)
def get_entreprise_canevas_endpoint(liste_id: str, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    _require_list_read_access(db, liste_id, current_entreprise.id)
    res = get_canevas_for_liste(db, liste_id)
    if not res: raise HTTPException(404, "Canevas non trouve")
    return res

@router.put("/canevas/{canevas_id}", response_model=CanevasOut)
def update_entreprise_canevas_endpoint(canevas_id: str, canevas_in: CanevasUpdate, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    can = get_canevas_by_id(db, canevas_id)
    if not can: raise HTTPException(404, "Canevas non trouve")
    _require_list_admin_access(db, can.id_liste, current_entreprise.id)
    return update_canevas(db, canevas_id, **canevas_in.model_dump(exclude_unset=True))

@router.delete("/canevas/{canevas_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entreprise_canevas_endpoint(canevas_id: str, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    can = get_canevas_by_id(db, canevas_id)
    if not can: raise HTTPException(404, "Canevas non trouve")
    _require_list_admin_access(db, can.id_liste, current_entreprise.id)
    delete_canevas(db, canevas_id)
    return None

@router.post("/sections/{canevas_id}", response_model=SectionOut)
def create_entreprise_section_endpoint(canevas_id: str, section_in: SectionCreate, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    canevas = get_canevas_by_id(db, canevas_id)
    if not canevas: raise HTTPException(404, "Canevas non trouve")
    _require_list_admin_access(db, canevas.id_liste, current_entreprise.id)
    return create_section(db, titre=section_in.titre, id_canevas=canevas_id)

@router.get("/sections/{canevas_id}", response_model=List[SectionOut])
def get_entreprise_sections_endpoint(canevas_id: str, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    can = get_canevas_by_id(db, canevas_id)
    if not can: raise HTTPException(404, "Canevas non trouve")
    _require_list_read_access(db, can.id_liste, current_entreprise.id)
    return get_sections_for_canevas(db, canevas_id)

@router.put("/sections/{section_id}", response_model=SectionOut)
def update_entreprise_section_endpoint(section_id: str, section_in: SectionUpdate, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    sec = get_section_by_id(db, section_id)
    if not sec: raise HTTPException(404, "Section non trouvee")
    can = get_canevas_by_id(db, sec.id_canevas)
    _require_list_admin_access(db, can.id_liste, current_entreprise.id)
    return update_section(db, section_id, **section_in.model_dump(exclude_unset=True))

@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entreprise_section_endpoint(section_id: str, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    sec = get_section_by_id(db, section_id)
    if not sec: raise HTTPException(404, "Section non trouvee")
    can = get_canevas_by_id(db, sec.id_canevas)
    _require_list_admin_access(db, can.id_liste, current_entreprise.id)
    delete_section(db, section_id)
    return None

@router.post("/checklists/{parent_id}", response_model=ChecklistOut)
def create_entreprise_checklist_endpoint(parent_id: str, checklist_in: ChecklistCreate, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    if checklist_in.id_tache:
        _require_task_management_access(db, checklist_in.id_tache, current_entreprise.id)
    elif checklist_in.id_section:
        sec = get_section_by_id(db, checklist_in.id_section)
        if not sec: raise HTTPException(404, "Section non trouvee")
        can = get_canevas_by_id(db, sec.id_canevas)
        _require_list_admin_access(db, can.id_liste, current_entreprise.id)
    return create_checklist(db, **checklist_in.model_dump())

@router.get("/checklists/tache/{tache_id}", response_model=List[ChecklistOut])
def get_entreprise_checklists_for_tache_endpoint(tache_id: str, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    _require_task_read_access(db, tache_id, current_entreprise.id)
    return get_checklists_for_tache(db, tache_id)

@router.put("/checklists/{checklist_id}", response_model=ChecklistOut)
def update_entreprise_checklist_endpoint(checklist_id: str, checklist_in: ChecklistUpdate, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    chk = get_checklist_by_id(db, checklist_id)
    if not chk: raise HTTPException(404, "Checklist non trouvee")
    if chk.id_tache:
        _require_task_management_access(db, chk.id_tache, current_entreprise.id)
    elif chk.id_section:
        sec = get_section_by_id(db, chk.id_section)
        can = get_canevas_by_id(db, sec.id_canevas)
        _require_list_admin_access(db, can.id_liste, current_entreprise.id)
    return update_checklist(db, checklist_id, **checklist_in.model_dump(exclude_unset=True))

@router.delete("/checklists/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entreprise_checklist_endpoint(checklist_id: str, db: Session = Depends(get_db), current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)):
    chk = get_checklist_by_id(db, checklist_id)
    if not chk: raise HTTPException(404, "Checklist non trouvee")
    if chk.id_tache:
        _require_task_management_access(db, chk.id_tache, current_entreprise.id)
    elif chk.id_section:
        sec = get_section_by_id(db, chk.id_section)
        can = get_canevas_by_id(db, sec.id_canevas)
        _require_list_admin_access(db, can.id_liste, current_entreprise.id)
    delete_checklist(db, checklist_id)
    return None


# -----------------------------------------------------------------------------
# RECHERCHE & FICHIERS
# -----------------------------------------------------------------------------

@router.get("/search/global")
def entreprise_global_search_endpoint(
    q: str,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(
        db,
        current_entreprise.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
    )
    return global_search(
        db,
        current_user_id=current_entreprise.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
    )


@router.get("/search/tasks")
def entreprise_search_tasks_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    membre_id: Optional[str] = None,
    has_files: Optional[bool] = None,
    has_checklists: Optional[bool] = None,
    overdue: Optional[bool] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(db, current_entreprise.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return search_tasks(
        db,
        current_user_id=current_entreprise.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        statut=statut,
        priorite=priorite,
        membre_id=membre_id,
        has_files=has_files,
        has_checklists=has_checklists,
        overdue=overdue,
        limit=limit,
    )


@router.get("/search/lists")
def entreprise_search_lists_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    creator_id: Optional[str] = None,
    has_files: Optional[bool] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(db, current_entreprise.id, workspace_id=workspace_id, espace_id=espace_id)
    return search_lists(
        db,
        current_user_id=current_entreprise.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        creator_id=creator_id,
        has_files=has_files,
        limit=limit,
    )


@router.get("/search/espaces")
def entreprise_search_espaces_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    parent_espace_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(db, current_entreprise.id, workspace_id=workspace_id, espace_id=parent_espace_id)
    return search_espaces(
        db,
        current_user_id=current_entreprise.id,
        q=q,
        workspace_id=workspace_id,
        parent_espace_id=parent_espace_id,
        limit=limit,
    )


@router.get("/search/sections")
def entreprise_search_sections_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(db, current_entreprise.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return search_sections(
        db,
        current_user_id=current_entreprise.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        limit=limit,
    )


@router.get("/search/checklists")
def entreprise_search_checklists_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
    is_checked: Optional[bool] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(
        db,
        current_entreprise.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
    )
    return search_checklists(
        db,
        current_user_id=current_entreprise.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
        is_checked=is_checked,
        limit=limit,
    )


@router.get("/search/members")
def entreprise_search_members_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
    role: Optional[str] = None,
    statut: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(
        db,
        current_entreprise.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
    )
    return search_members(
        db,
        current_user_id=current_entreprise.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
        role=role,
        statut=statut,
        limit=limit,
    )


@router.get("/search/files")
def entreprise_search_files_endpoint(
    q: Optional[str] = None,
    type_fichier: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(
        db,
        current_entreprise.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
    )
    return search_files(
        db,
        current_user_id=current_entreprise.id,
        q=q,
        type_fichier=type_fichier,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
        limit=limit,
    )


@router.post("/files", response_model=FichierOut, status_code=status.HTTP_201_CREATED)
def entreprise_create_file_endpoint(
    file_in: FichierAttachmentCreate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return create_file_attachment(
        db,
        current_user_id=current_entreprise.id,
        **file_in.model_dump(),
    )


@router.get("/files", response_model=List[FichierOut])
def entreprise_list_files_endpoint(
    q: Optional[str] = None,
    type_fichier: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    if bool(target_type) != bool(target_id):
        raise HTTPException(status_code=400, detail="Fournissez target_type et target_id ensemble.")
    if target_type and target_id:
        _require_attachment_target_read_access(db, target_type, target_id, current_entreprise.id)
    return list_accessible_files(
        db,
        current_user_id=current_entreprise.id,
        q=q,
        type_fichier=type_fichier,
        scope_type=target_type,
        scope_id=target_id,
        limit=limit,
    )


@router.get("/files/{file_id}", response_model=FichierOut)
def entreprise_get_file_endpoint(
    file_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    fichier = get_file_by_id(db, file_id)
    if not fichier:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    target_type = (fichier.meta_donnees or {}).get("target_type")
    target_id = (fichier.meta_donnees or {}).get("target_id")
    if not target_type or not target_id:
        raise HTTPException(status_code=403, detail="Ce fichier n'est pas correctement rattache.")
    _require_attachment_target_read_access(db, target_type, target_id, current_entreprise.id)
    return fichier


@router.put("/files/{file_id}", response_model=FichierOut)
def entreprise_update_file_endpoint(
    file_id: str,
    file_in: FichierUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return update_file_attachment(
        db,
        file_id=file_id,
        current_user_id=current_entreprise.id,
        **file_in.model_dump(exclude_unset=True),
    )


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def entreprise_delete_file_endpoint(
    file_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    delete_file_attachment(db, file_id=file_id, current_user_id=current_entreprise.id)
    return None


@router.post("/files/{file_id}/share", response_model=FichierShareOut)
def entreprise_share_file_endpoint(
    file_id: str,
    share_in: FichierShareCreate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return create_file_share_token(
        db,
        file_id=file_id,
        current_user_id=current_entreprise.id,
        expires_in_hours=share_in.expires_in_hours,
        allow_download=share_in.allow_download,
    )


@router.get("/files/share/resolve")
def entreprise_resolve_file_share_endpoint(
    token: str,
    db: Session = Depends(get_db),
):
    return resolve_file_share_token(db, token)


# -----------------------------------------------------------------------------
# RAPPORTS & ABSENCES
# -----------------------------------------------------------------------------

@router.post("/rapports", response_model=RapportOut, status_code=status.HTTP_201_CREATED)
def entreprise_create_report_endpoint(
    report_in: RapportCreate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return create_report(db, current_user_id=current_entreprise.id, **report_in.model_dump())


@router.get("/rapports", response_model=List[dict])
def entreprise_list_reports_endpoint(
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    member_id: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(db, current_entreprise.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return list_accessible_reports(
        db,
        current_user_id=current_entreprise.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        member_id=member_id,
        q=q,
        limit=limit,
    )


@router.get("/rapports/{report_id}", response_model=RapportOut)
def entreprise_get_report_endpoint(
    report_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return get_report(db, report_id=report_id, current_user_id=current_entreprise.id)


@router.put("/rapports/{report_id}", response_model=RapportOut)
def entreprise_update_report_endpoint(
    report_id: str,
    report_in: RapportUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return update_report(
        db,
        report_id=report_id,
        current_user_id=current_entreprise.id,
        **report_in.model_dump(exclude_unset=True),
    )


@router.delete("/rapports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def entreprise_delete_report_endpoint(
    report_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    delete_report(db, report_id=report_id, current_user_id=current_entreprise.id)
    return None


@router.post("/absences", response_model=AbsenceEtCongeOut, status_code=status.HTTP_201_CREATED)
def entreprise_create_absence_endpoint(
    absence_in: AbsenceEtCongeCreate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return create_leave_request(db, current_user_id=current_entreprise.id, **absence_in.model_dump())


@router.get("/absences", response_model=List[dict])
def entreprise_list_absences_endpoint(
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    member_id: Optional[str] = None,
    statut: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(db, current_entreprise.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return list_accessible_absences(
        db,
        current_user_id=current_entreprise.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        member_id=member_id,
        statut=statut,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )


@router.get("/absences/calendar", response_model=List[AbsenceCalendarOut])
def entreprise_calendar_endpoint(
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    _validate_search_scope(db, current_entreprise.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return get_team_calendar(
        db,
        current_user_id=current_entreprise.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )


@router.get("/absences/{absence_id}", response_model=AbsenceEtCongeOut)
def entreprise_get_absence_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return get_absence(db, absence_id=absence_id, current_user_id=current_entreprise.id)


@router.put("/absences/{absence_id}", response_model=AbsenceEtCongeOut)
def entreprise_update_absence_endpoint(
    absence_id: str,
    absence_in: AbsenceEtCongeUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return update_absence(
        db,
        absence_id=absence_id,
        current_user_id=current_entreprise.id,
        **absence_in.model_dump(exclude_unset=True),
    )


@router.post("/absences/{absence_id}/approve", response_model=AbsenceEtCongeOut)
def entreprise_approve_absence_endpoint(
    absence_id: str,
    decision: AbsenceDecisionRequest,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return approve_leave(db, absence_id=absence_id, current_user_id=current_entreprise.id, commentaire=decision.commentaire or decision.motif)


@router.post("/absences/{absence_id}/reject", response_model=AbsenceEtCongeOut)
def entreprise_reject_absence_endpoint(
    absence_id: str,
    decision: AbsenceDecisionRequest,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return reject_leave(db, absence_id=absence_id, current_user_id=current_entreprise.id, motif_rejet=decision.motif or decision.commentaire)


@router.post("/absences/{absence_id}/cancel", response_model=AbsenceEtCongeOut)
def entreprise_cancel_absence_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return cancel_leave(db, absence_id=absence_id, current_user_id=current_entreprise.id)


@router.post("/absences/{absence_id}/finish", response_model=AbsenceEtCongeOut)
def entreprise_finish_absence_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return finish_leave(db, absence_id=absence_id, current_user_id=current_entreprise.id)


@router.get("/absences/{absence_id}/conflicts", response_model=List[AbsenceConflictOut])
def entreprise_absence_conflicts_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return get_absence_conflicts(db, absence_id=absence_id, current_user_id=current_entreprise.id)


@router.delete("/absences/{absence_id}", status_code=status.HTTP_204_NO_CONTENT)
def entreprise_delete_absence_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    delete_absence(db, absence_id=absence_id, current_user_id=current_entreprise.id)
    return None
