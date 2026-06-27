# backend/api_liste_et_tache/routes/utilisateur.py
from datetime import datetime
from typing import List, Optional
from urllib.parse import quote
from fastapi import APIRouter, Body, Depends, HTTPException, status, BackgroundTasks, File, UploadFile
import shutil
import os
from pathlib import Path
from fastapi.responses import RedirectResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session
from ..core.emails import send_liste_invitation_email
from ..core.database import get_db
from ..crud.canevas_enhanced import get_enhanced_canevas
from ..core.security import get_current_user, decode_invitation_token, config_data
from ..core.function import (
    LISTE_OWNER_ROLE,
    LISTE_MEMBER_ROLE,
    _get_workspace_or_404,
    _require_attachment_target_read_access,
    _require_workspace_management_access,
    _get_workspace_member_or_403,
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
    _require_assigned_task_operational_access,
    _require_task_management_access,
    _require_task_read_access,
    _validate_list_member_management_permissions,
    _require_workspace_descendant_read_access,
    _serialize_member,
    get_parent_inherited_role,
    ResourceType,
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
    get_absence_impact,
    list_accessible_absences,
    reject_leave,
    update_absence,
)
from ..crud.liste import (
    assign_member_to_liste,
    create_liste,
    delete_liste,
    get_liste_members,
    get_listes_for_espace,
    get_listes_for_workspace,
    unassign_member_from_liste,
    update_liste,
    invite_member_to_liste,
    accept_liste_invitation,
    get_liste_member_record,
    get_liste_by_id,
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
from ..crud.checklist_canevas import (
    create_canevas, get_canevas_for_liste, update_canevas, delete_canevas, get_canevas_by_id,
    create_section, get_sections_for_canevas, update_section, delete_section, get_section_by_id,
    create_checklist, get_checklists_for_tache, update_checklist, delete_checklist, get_checklist_by_id,
    get_checklists_for_section
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
from ..schemas import (
    UtilisateurOut,
    ListeOut,
    ListeCreate,
    ListeUpdate,
    TacheOut,
    TacheCreate,
    TacheUpdate,
    TacheFullOut,
    TacheKanbanOut,
    TacheBulkUpdate,
    FichierAttachmentCreate,
    FichierOut,
    FichierShareCreate,
    FichierShareOut,
    FichierUpdate,
    MessageResponse,
    MembreOut,
    WorkspaceMemberOut,
    RapportCreate,
    RapportOut,
    RapportUpdate,
    AbsenceEtCongeCreate,
    AbsenceEtCongeUpdate,
    AbsenceEtCongeOut,
    AbsenceDecisionRequest,
    AbsenceCalendarOut,
    AbsenceConflictOut,
    AbsenceImpactOut,
    UserAvailabilityOut,
    UserAvailabilityRequest,
    CanevasOut, CanevasCreate, CanevasUpdate,
    SectionOut, SectionCreate, SectionUpdate,
    ChecklistOut, ChecklistCreate, ChecklistUpdate, ChecklistBase,
    WorkspaceMemberInvite,
)
from ..models import Checklist, Liste, Tache, Utilisateur

router = APIRouter(prefix="/listes", tags=["Listes & Tâches"])


def _task_branch_is_owned_by_user(db: Session, tache_id: str, user_id: str) -> bool:
    """
    Vérifie si l'utilisateur est propriétaire (créateur ou administrateur) 
    de la tâche et de toutes ses sous-tâches.
    
    La propriété est déterminée par héritage à travers la hiérarchie :
    Workspace → Espace → Liste → Tache
    
    Un utilisateur est considéré comme propriétaire si :
    - Il est Créateur ou Administrateur du Workspace parent
    - Il est Créateur ou Administrateur de l'Espace parent
    - Il est Créateur ou Administrateur de la Liste parente
    - Il est Créateur ou Administrateur direct de la Tâche
    """
    # Récupérer le rôle hérité de l'utilisateur sur la tâche
    inherited_role = get_parent_inherited_role(db, user_id, ResourceType.TACHE, tache_id)
    
    # Si l'utilisateur a un rôle hérité (Créateur/Admin/Membre/Invité)
    if inherited_role:
        role, source_type, source_id = inherited_role
        # Les rôles Créateur et Administrateur donnent des droits de propriété
        if role in ["Créateur", "Administrateur"]:
            return True
        # Si l'utilisateur est Membre ou Invité, il n'a pas les droits de propriété
        return False
    
    # Si pas de rôle hérité, vérifier si l'utilisateur est assigné directement à la tâche
    direct_assignment = db.query(Membre).filter(
        Membre.id_tache == tache_id,
        Membre.id_utilisateur == user_id,
        Membre.statut == "Actif"
    ).first()
    
    if direct_assignment:
        # Si assigné avec rôle Créateur ou Administrateur, c'est un propriétaire
        if direct_assignment.role in ["Créateur", "Administrateur"]:
            return True
    
    return False


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
    # ✅ Si on a un liste_id, on vérifie l'accès à la liste directement
    if liste_id:
        _require_list_read_access(db, liste_id, user_id)
        return
    
    # ✅ Si on a un espace_id, on vérifie l'accès à l'espace
    if espace_id:
        _require_espace_descendant_read_access(db, espace_id, user_id)
        return
    
    # ✅ Si on a un workspace_id, on vérifie l'accès au workspace
    if workspace_id:
        _require_workspace_descendant_read_access(db, workspace_id, user_id)
        return
    
    # ✅ Si on a un tache_id, on vérifie l'accès à la tâche
    if tache_id:
        _require_task_read_access(db, tache_id, user_id)
        return


# -----------------------------------------------------------------------------
# LISTES
# -----------------------------------------------------------------------------

@router.post("/create_liste", response_model=ListeOut, status_code=status.HTTP_201_CREATED)
def create_liste_endpoint(
    liste_in: ListeCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    """Créer une liste dans un workspace ou un espace."""
    if liste_in.id_workspace:
        _get_workspace_or_404(db, liste_in.id_workspace)
        _require_workspace_management_access(db, liste_in.id_workspace, current_user.id)
    else:
        _require_espace_management_access(db, liste_in.id_espace, current_user.id)
        
    return create_liste(
        db, 
        nom=liste_in.nom, 
        description=liste_in.description, 
        id_espace=liste_in.id_espace, 
        id_workspace=liste_in.id_workspace,
        creator_user_id=current_user.id,
    )

@router.get("/list_projets", response_model=List[ListeOut])
def get_listes_endpoint(
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    """Lister les listes d'un workspace ou d'un espace."""
    if (workspace_id is None) == (espace_id is None):
        raise HTTPException(status_code=400, detail="Specifiez soit workspace_id, soit espace_id")
    
    if workspace_id:
        try:
            _require_workspace_descendant_read_access(db, workspace_id, current_user.id)
        except HTTPException:
            return [
                liste
                for liste in get_listes_for_workspace(db, workspace_id)
                if _can_read_liste_silently(db, liste.id, current_user.id)
            ]
        return get_listes_for_workspace(db, workspace_id)
    else:
        _require_espace_descendant_read_access(db, espace_id, current_user.id)
        return get_listes_for_espace(db, espace_id)

@router.get("/{liste_id}/get_liste", response_model=ListeOut)
def get_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_read_access(db, liste_id, current_user.id)
    return _get_liste_or_404(db, liste_id)

@router.put("/{liste_id}/update_liste", response_model=ListeOut)
def update_liste_endpoint(
    liste_id: str,
    liste_in: ListeUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_admin_access(db, liste_id, current_user.id)
    upd = update_liste(db, liste_id, **liste_in.model_dump(exclude_unset=True))
    if not upd:
        raise HTTPException(status_code=404, detail="Liste non trouvee")
    return upd

@router.delete("/{liste_id}/delete_liste", status_code=status.HTTP_204_NO_CONTENT)
def delete_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_delete_access(db, liste_id, current_user.id)
    if not delete_liste(db, liste_id):
        raise HTTPException(status_code=404, detail="Liste non trouvee")
    return None

@router.post("/{liste_id}/assign/{utilisateur_id}/assign_liste", response_model=MembreOut)
def assign_liste_endpoint(
    liste_id: str,
    utilisateur_id: str,
    role: str = Body(LISTE_MEMBER_ROLE, embed=True),
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_member_management_access(db, liste_id, current_user.id)
    _, actor_role, actor_source_type, actor_source_id = _get_list_member_management_grant(
        db, liste_id, current_user.id
    )
    _validate_list_member_management_permissions(
        liste_id=liste_id,
        actor_role=actor_role,
        actor_source_type=actor_source_type,
        actor_source_id=actor_source_id,
        target_member=_get_liste_member_record(db, liste_id, utilisateur_id),
        new_role=role,
    )
    return assign_member_to_liste(db, liste_id, utilisateur_id, role)

@router.delete("/{liste_id}/unassign/{utilisateur_id}/unassign_liste", status_code=status.HTTP_204_NO_CONTENT)
def unassign_liste_endpoint(
    liste_id: str,
    utilisateur_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if utilisateur_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez pas vous retirer via la gestion des membres.",
        )
    _require_list_member_management_access(db, liste_id, current_user.id)
    target_member = _get_liste_member_record(db, liste_id, utilisateur_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    _, actor_role, actor_source_type, actor_source_id = _get_list_member_management_grant(
        db, liste_id, current_user.id
    )
    if actor_role != LISTE_OWNER_ROLE:
        raise HTTPException(
            status_code=403,
            detail="Seul le createur de la ressource peut retirer un membre.",
        )
    _validate_list_member_management_permissions(
        liste_id=liste_id,
        actor_role=actor_role,
        actor_source_type=actor_source_type,
        actor_source_id=actor_source_id,
        target_member=target_member,
    )
    unassign_member_from_liste(db, liste_id, utilisateur_id)
    return None

@router.get("/{liste_id}/list_members_liste", response_model=List[WorkspaceMemberOut])
def get_liste_members_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_read_access(db, liste_id, current_user.id)
    return [_serialize_member(membre) for membre in get_liste_members(db, liste_id)]

# -----------------------------------------------------------------------------
# TACHES
# -----------------------------------------------------------------------------

@router.post("/{liste_id}/create_tache", response_model=TacheOut, status_code=status.HTTP_201_CREATED)
def create_tache_endpoint(
    liste_id: str,
    tache_in: TacheCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    payload = tache_in.model_dump(exclude={"id_liste"})
    parent_task_id = payload.get("id_tache_parent")
    if parent_task_id:
        parent_task = _get_tache_or_404(db, parent_task_id)
        if parent_task.id_liste != liste_id:
            raise HTTPException(
                status_code=400,
                detail="La sous-tâche doit appartenir au même projet que sa tâche parente.",
            )
        _require_assigned_task_operational_access(db, parent_task_id, current_user.id)
    else:
        _require_list_admin_access(db, liste_id, current_user.id)
    
    # ✅ Passer creator_user_id pour que le créateur soit automatiquement membre de la tâche
    return create_tache(db, **payload, id_liste=liste_id, creator_user_id=current_user.id)

@router.get("/{liste_id}/list_taches", response_model=List[TacheFullOut])
def get_taches_endpoint(
    liste_id: str,
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    membre_id: Optional[str] = None,
    sort_by: str = "ordre_affichage",
    order: str = "asc",
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_read_access(db, liste_id, current_user.id)
    return get_taches_for_liste(
        db, liste_id, 
        statut=statut, 
        priorite=priorite, 
        membre_id=membre_id, 
        sort_by=sort_by, 
        order=order
    )

@router.get("/taches/{tache_id}/get_tache", response_model=TacheOut)
def get_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_task_read_access(db, tache_id, current_user.id)
    return _get_tache_or_404(db, tache_id)

@router.put("/taches/{tache_id}/update_tache", response_model=TacheOut)
def update_tache_endpoint(
    tache_id: str,
    tache_in: TacheUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    updates = tache_in.model_dump(exclude_unset=True)
    tache = _get_tache_or_404(db, tache_id)
    
    try:
        _require_task_management_access(db, tache_id, current_user.id)
    except HTTPException as exc:
        if exc.status_code != 403:
            raise
        if tache.statut == "terminé":
            raise HTTPException(
                status_code=403,
                detail="Seul un responsable de la liste peut rouvrir une tache terminee.",
            ) from exc
        _require_assigned_task_operational_access(db, tache_id, current_user.id)
        forbidden_fields = set(updates) - {"statut"}
        if forbidden_fields:
            raise HTTPException(
                status_code=403,
                detail="Un membre assigne peut uniquement modifier le statut de la tache.",
            ) from exc
    
    if tache.statut == "terminé" and "statut" in updates:
        allowed_reopen_statuses = {"en cours", "bloqué", "terminé"}
        if updates["statut"] not in allowed_reopen_statuses:
            raise HTTPException(
                status_code=403,
                detail="Une tache terminee peut uniquement etre remise en cours ou bloquee.",
            )
    
    return update_tache(db, tache_id, **updates)

@router.delete("/taches/{tache_id}/delete_tache", status_code=status.HTTP_204_NO_CONTENT)
def delete_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    
    try:
        _require_list_admin_access(db, tache.id_liste, current_user.id)
    except HTTPException as exc:
        if exc.status_code != 403:
            raise
        if not _task_branch_is_owned_by_user(db, tache_id, current_user.id):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Seuls les gestionnaires peuvent supprimer cette tâche. "
                    "Un membre assigné ne peut pas supprimer une tâche qu'il n'a pas créée "
                    "et dont il n'est pas administrateur."
                ),
            ) from exc
    
    delete_tache(db, tache_id)
    return None

# VUES
@router.get("/{liste_id}/vues/kanban", response_model=TacheKanbanOut)
def get_kanban_view_endpoint(
    liste_id: str, 
    db: Session = Depends(get_db), 
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_read_access(db, liste_id, current_user.id)
    return {"columns": get_taches_kanban(db, liste_id)}

@router.get("/{liste_id}/vues/gantt", response_model=List[TacheFullOut])
def get_gantt_view_endpoint(
    liste_id: str, 
    db: Session = Depends(get_db), 
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_read_access(db, liste_id, current_user.id)
    return get_taches_for_liste(db, liste_id, sort_by="date_debut", order="asc")

@router.get("/{liste_id}/vues/tableau", response_model=List[TacheFullOut])
def get_tableau_view_endpoint(
    liste_id: str, 
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    membre_id: Optional[str] = None,
    sort_by: str = "ordre_affichage",
    order: str = "asc",
    db: Session = Depends(get_db), 
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_read_access(db, liste_id, current_user.id)
    return get_taches_for_liste(
        db, liste_id, 
        statut=statut, 
        priorite=priorite, 
        membre_id=membre_id, 
        sort_by=sort_by, 
        order=order
    )

@router.patch("/taches/bulk_update_taches", response_model=MessageResponse)
def bulk_update_taches_endpoint(
    bulk_in: TacheBulkUpdate, 
    db: Session = Depends(get_db), 
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not bulk_in.items:
        return {"message": "Aucune modification fournie"}
    
    first_tache = _get_tache_or_404(db, bulk_in.items[0].id)
    _require_list_admin_access(db, first_tache.id_liste, current_user.id)
    
    if update_taches_bulk(db, [it.model_dump(exclude_unset=True) for it in bulk_in.items]):
        return {"message": "Mise à jour groupée réussie"}
    else:
        raise HTTPException(status_code=400, detail="Échec de la mise à jour groupée")

@router.post("/taches/{tache_id}/assign/{utilisateur_id}/assign_tache", response_model=MembreOut)
def assign_tache_endpoint(
    tache_id: str,
    utilisateur_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_admin_access(db, tache.id_liste, current_user.id)
    return assign_member_to_tache(db, tache_id, utilisateur_id)

@router.delete("/taches/{tache_id}/unassign/{utilisateur_id}/unassign_tache", status_code=status.HTTP_204_NO_CONTENT)
def unassign_tache_endpoint(
    tache_id: str,
    utilisateur_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_admin_access(db, tache.id_liste, current_user.id)
    unassign_member_from_tache(db, tache_id, utilisateur_id)
    return None

@router.get("/taches/{tache_id}/list_members_tache", response_model=List[WorkspaceMemberOut])
def get_tache_members_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_task_read_access(db, tache_id, current_user.id)
    return [_serialize_member(membre) for membre in get_tache_members(db, tache_id)]

# -----------------------------------------------------------------------------
# CANEVAS, SECTIONS
# -----------------------------------------------------------------------------

@router.post("/{liste_id}/canevas", response_model=CanevasOut)
def create_canevas_endpoint(liste_id: str, canevas_in: CanevasCreate, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    _require_list_admin_access(db, liste_id, current_user.id)
    return create_canevas(db, is_verrouille=canevas_in.is_verrouille, id_liste=liste_id)

@router.get("/{liste_id}/canevas", response_model=CanevasOut)
def get_canevas_endpoint(liste_id: str, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    _require_list_read_access(db, liste_id, current_user.id)
    res = get_canevas_for_liste(db, liste_id)
    if not res: raise HTTPException(404, "Canevas non trouve")
    return res

@router.post("/sections/{canevas_id}", response_model=SectionOut)
def create_section_endpoint(
    canevas_id: str, 
    section_in: SectionCreate, 
    db: Session = Depends(get_db), 
    current_user: UtilisateurOut = Depends(get_current_user)
):
    canevas = get_canevas_by_id(db, canevas_id)
    if not canevas:
        raise HTTPException(404, "Canevas non trouve")
    _require_list_admin_access(db, canevas.id_liste, current_user.id)
    return create_section(db, titre=section_in.titre, id_canevas=canevas_id)

@router.get("/sections/{canevas_id}", response_model=List[SectionOut])
def get_sections_endpoint(canevas_id: str, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    can = get_canevas_by_id(db, canevas_id)
    if not can: raise HTTPException(404, "Canevas non trouve")
    _require_list_read_access(db, can.id_liste, current_user.id)
    return get_sections_for_canevas(db, canevas_id)

@router.put("/sections/{section_id}", response_model=SectionOut)
def update_section_endpoint(section_id: str, section_in: SectionUpdate, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    sec = get_section_by_id(db, section_id)
    if not sec: raise HTTPException(404, "Section non trouvee")
    can = get_canevas_by_id(db, sec.id_canevas)
    _require_list_admin_access(db, can.id_liste, current_user.id)
    return update_section(db, section_id, **section_in.model_dump(exclude_unset=True))

@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section_endpoint(section_id: str, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    sec = get_section_by_id(db, section_id)
    if not sec: raise HTTPException(404, "Section non trouvee")
    can = get_canevas_by_id(db, sec.id_canevas)
    _require_list_admin_access(db, can.id_liste, current_user.id)
    delete_section(db, section_id)
    return None

@router.put("/canevas/{canevas_id}", response_model=CanevasOut)
def update_canevas_endpoint(canevas_id: str, canevas_in: CanevasUpdate, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    can = get_canevas_by_id(db, canevas_id)
    if not can: raise HTTPException(404, "Canevas non trouve")
    _require_list_admin_access(db, can.id_liste, current_user.id)
    return update_canevas(db, canevas_id, **canevas_in.model_dump(exclude_unset=True))

@router.delete("/canevas/{canevas_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_canevas_endpoint(canevas_id: str, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    can = get_canevas_by_id(db, canevas_id)
    if not can: raise HTTPException(404, "Canevas non trouve")
    _require_list_admin_access(db, can.id_liste, current_user.id)
    delete_canevas(db, canevas_id)
    return None

@router.get("/{liste_id}/canevas/enhanced", response_model=dict)
def get_enhanced_canevas_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_read_access(db, liste_id, current_user.id)
    return get_enhanced_canevas(db, liste_id)

# -----------------------------------------------------------------------------
# CHECKLISTS
# -----------------------------------------------------------------------------

@router.post("/taches/{tache_id}/checklists", response_model=ChecklistOut, status_code=status.HTTP_201_CREATED)
def create_checklist_for_tache_endpoint(
    tache_id: str,
    checklist_in: ChecklistBase,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_assigned_task_operational_access(db, tache_id, current_user.id)
    return create_checklist(
        db,
        texte=checklist_in.texte,
        is_checked=checklist_in.is_checked,
        id_tache=tache_id,
    )

@router.get("/taches/{tache_id}/checklists", response_model=List[ChecklistOut])
def get_checklists_for_tache_v2_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_task_read_access(db, tache_id, current_user.id)
    return get_checklists_for_tache(db, tache_id)

@router.post("/taches/{tache_id}/update-status-from-checklists", response_model=MessageResponse)
def update_task_status_from_checklists_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_assigned_task_operational_access(db, tache_id, current_user.id)
    from ..crud.tache import update_tache_status_based_on_checklists
    update_tache_status_based_on_checklists(db, tache_id)
    return {"message": "Statut mis à jour avec succès"}

@router.post("/sections/{section_id}/checklists", response_model=ChecklistOut, status_code=status.HTTP_201_CREATED)
def create_checklist_for_section_endpoint(
    section_id: str,
    checklist_in: ChecklistBase,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    section = get_section_by_id(db, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section non trouvee")
    canevas = get_canevas_by_id(db, section.id_canevas)
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas non trouve")
    _require_list_admin_access(db, canevas.id_liste, current_user.id)
    return create_checklist(
        db,
        texte=checklist_in.texte,
        is_checked=checklist_in.is_checked,
        id_section=section_id,
    )

@router.get("/sections/{section_id}/checklists", response_model=List[ChecklistOut])
def get_checklists_for_section_v2_endpoint(
    section_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    section = get_section_by_id(db, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section non trouvee")
    canevas = get_canevas_by_id(db, section.id_canevas)
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas non trouve")
    _require_list_read_access(db, canevas.id_liste, current_user.id)
    return get_checklists_for_section(db, section_id)

@router.get("/checklists/{checklist_id}", response_model=ChecklistOut)
def get_checklist_endpoint(
    checklist_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    chk = get_checklist_by_id(db, checklist_id)
    if not chk:
        raise HTTPException(404, "Checklist non trouvee")
    if chk.id_tache:
        _require_task_read_access(db, chk.id_tache, current_user.id)
    elif chk.id_section:
        sec = get_section_by_id(db, chk.id_section)
        can = get_canevas_by_id(db, sec.id_canevas)
        _require_list_read_access(db, can.id_liste, current_user.id)
    return chk

@router.put("/checklists/{checklist_id}", response_model=ChecklistOut)
def update_checklist_endpoint(
    checklist_id: str,
    checklist_in: ChecklistUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    chk = get_checklist_by_id(db, checklist_id)
    if not chk:
        raise HTTPException(404, "Checklist non trouvee")
    updates = checklist_in.model_dump(exclude_unset=True)
    
    if chk.id_tache:
        try:
            _require_task_management_access(db, chk.id_tache, current_user.id)
        except HTTPException as exc:
            if exc.status_code != 403:
                raise
            if set(updates) - {"is_checked"}:
                raise HTTPException(
                    status_code=403,
                    detail="Un membre assigne peut uniquement modifier le statut d'une checklist.",
                ) from exc
            _require_assigned_task_operational_access(db, chk.id_tache, current_user.id)
    elif chk.id_section:
        sec = get_section_by_id(db, chk.id_section)
        can = get_canevas_by_id(db, sec.id_canevas)
        _require_list_admin_access(db, can.id_liste, current_user.id)
    
    return update_checklist(db, checklist_id, **updates)

@router.delete("/checklists/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_endpoint(
    checklist_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    chk = get_checklist_by_id(db, checklist_id)
    if not chk:
        raise HTTPException(404, "Checklist non trouvee")
    
    if chk.id_tache:
        try:
            _require_task_management_access(db, chk.id_tache, current_user.id)
        except HTTPException as exc:
            if exc.status_code != 403:
                raise
            if not _task_branch_is_owned_by_user(db, chk.id_tache, current_user.id):
                raise HTTPException(
                    status_code=403,
                    detail="Seuls les gestionnaires ou le propriétaire de cette tâche peuvent supprimer cette checklist.",
                ) from exc
    elif chk.id_section:
        sec = get_section_by_id(db, chk.id_section)
        can = get_canevas_by_id(db, sec.id_canevas)
        _require_list_admin_access(db, can.id_liste, current_user.id)
    
    delete_checklist(db, checklist_id)
    return None

@router.get("/checklists/tache/{tache_id}", response_model=List[ChecklistOut])
def get_checklists_for_tache_legacy_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_task_read_access(db, tache_id, current_user.id)
    return get_checklists_for_tache(db, tache_id)


# -----------------------------------------------------------------------------
# RECHERCHE & FICHIERS
# -----------------------------------------------------------------------------

@router.get("/search/global")
def global_search_endpoint(
    q: str,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(
        db,
        current_user.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
    )
    return global_search(
        db,
        current_user_id=current_user.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
    )


@router.get("/search/tasks")
def search_tasks_endpoint(
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
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(db, current_user.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return search_tasks(
        db,
        current_user_id=current_user.id,
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
def search_lists_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    creator_id: Optional[str] = None,
    has_files: Optional[bool] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(db, current_user.id, workspace_id=workspace_id, espace_id=espace_id)
    return search_lists(
        db,
        current_user_id=current_user.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        creator_id=creator_id,
        has_files=has_files,
        limit=limit,
    )


@router.get("/search/espaces")
def search_espaces_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    parent_espace_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(db, current_user.id, workspace_id=workspace_id, espace_id=parent_espace_id)
    return search_espaces(
        db,
        current_user_id=current_user.id,
        q=q,
        workspace_id=workspace_id,
        parent_espace_id=parent_espace_id,
        limit=limit,
    )


@router.get("/search/sections")
def search_sections_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(db, current_user.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return search_sections(
        db,
        current_user_id=current_user.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        limit=limit,
    )


@router.get("/search/checklists")
def search_checklists_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
    is_checked: Optional[bool] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(
        db,
        current_user.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
    )
    return search_checklists(
        db,
        current_user_id=current_user.id,
        q=q,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
        is_checked=is_checked,
        limit=limit,
    )


@router.get("/search/members")
def search_members_endpoint(
    q: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
    role: Optional[str] = None,
    statut: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(
        db,
        current_user.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
    )
    return search_members(
        db,
        current_user_id=current_user.id,
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
def search_files_endpoint(
    q: Optional[str] = None,
    type_fichier: Optional[str] = None,
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    tache_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(
        db,
        current_user.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
    )
    return search_files(
        db,
        current_user_id=current_user.id,
        q=q,
        type_fichier=type_fichier,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        tache_id=tache_id,
        limit=limit,
    )


@router.post("/files", response_model=FichierOut, status_code=status.HTTP_201_CREATED)
def create_file_endpoint(
    file_in: FichierAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return create_file_attachment(
        db,
        current_user_id=current_user.id,
        **file_in.model_dump(),
    )


@router.post("/files/upload")
async def upload_file_endpoint(
    file: UploadFile = File(...),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Télécharge un fichier binaire et retourne son URL."""
    uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
    os.makedirs(uploads_dir, exist_ok=True)

    filename = os.path.basename(file.filename)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    unique_filename = f"{timestamp}_{filename}"
    file_path = uploads_dir / unique_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    base_url = config_data.get("LISTE_TACHE_URL", "http://localhost:8004").rstrip("/")
    file_url = f"{base_url}/uploads/{unique_filename}"

    return {
        "filename": filename,
        "url": file_url,
        "content_type": file.content_type
    }


@router.get("/files", response_model=List[FichierOut])
def list_files_endpoint(
    q: Optional[str] = None,
    type_fichier: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    member_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    if bool(target_type) != bool(target_id):
        raise HTTPException(status_code=400, detail="Fournissez target_type et target_id ensemble.")
    if target_type and target_id:
        _require_attachment_target_read_access(db, target_type, target_id, current_user.id)
    return list_accessible_files(
        db,
        current_user_id=current_user.id,
        q=q,
        type_fichier=type_fichier,
        scope_type=target_type,
        scope_id=target_id,
        member_id=member_id,
        limit=limit,
    )


@router.get("/files/{file_id}", response_model=FichierOut)
def get_file_endpoint(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    fichier = get_file_by_id(db, file_id)
    if not fichier:
        raise HTTPException(status_code=404, detail="Fichier non trouve")
    target_type = (fichier.meta_donnees or {}).get("target_type")
    target_id = (fichier.meta_donnees or {}).get("target_id")
    if not target_type or not target_id:
        raise HTTPException(status_code=403, detail="Ce fichier n'est pas correctement rattache.")
    _require_attachment_target_read_access(db, target_type, target_id, current_user.id)
    return fichier


@router.put("/files/{file_id}", response_model=FichierOut)
def update_file_endpoint(
    file_id: str,
    file_in: FichierUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return update_file_attachment(
        db,
        file_id=file_id,
        current_user_id=current_user.id,
        **file_in.model_dump(exclude_unset=True),
    )


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file_endpoint(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    delete_file_attachment(db, file_id=file_id, current_user_id=current_user.id)
    return None


@router.post("/files/{file_id}/share", response_model=FichierShareOut)
def share_file_endpoint(
    file_id: str,
    share_in: FichierShareCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return create_file_share_token(
        db,
        file_id=file_id,
        current_user_id=current_user.id,
        expires_in_hours=share_in.expires_in_hours,
        allow_download=share_in.allow_download,
    )


@router.get("/files/share/resolve")
def resolve_file_share_endpoint(
    token: str,
    db: Session = Depends(get_db),
):
    return resolve_file_share_token(db, token)


# -----------------------------------------------------------------------------
# RAPPORTS & ABSENCES
# -----------------------------------------------------------------------------

@router.post("/rapports", response_model=RapportOut, status_code=status.HTTP_201_CREATED)
def create_report_endpoint(
    report_in: RapportCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return create_report(db, current_user_id=current_user.id, **report_in.model_dump())


@router.get("/rapports", response_model=List[dict])
def list_reports_endpoint(
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    member_id: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(db, current_user.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return list_accessible_reports(
        db,
        current_user_id=current_user.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        member_id=member_id,
        q=q,
        limit=limit,
    )


@router.get("/rapports/{report_id}", response_model=RapportOut)
def get_report_endpoint(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return get_report(db, report_id=report_id, current_user_id=current_user.id)


@router.put("/rapports/{report_id}", response_model=RapportOut)
def update_report_endpoint(
    report_id: str,
    report_in: RapportUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return update_report(
        db,
        report_id=report_id,
        current_user_id=current_user.id,
        **report_in.model_dump(exclude_unset=True),
    )


@router.delete("/rapports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report_endpoint(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    delete_report(db, report_id=report_id, current_user_id=current_user.id)
    return None


@router.post("/absences", response_model=AbsenceEtCongeOut, status_code=status.HTTP_201_CREATED)
def create_absence_endpoint(
    absence_in: AbsenceEtCongeCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    # ✅ Exclure decision_commentaire car il n'est pas accepté par create_leave_request
    absence_data = absence_in.model_dump(exclude={"decision_commentaire"})
    return create_leave_request(db, current_user_id=current_user.id, **absence_data)


@router.get("/absences", response_model=List[dict])
def list_absences_endpoint(
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    member_id: Optional[str] = None,
    statut: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(db, current_user.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return list_accessible_absences(
        db,
        current_user_id=current_user.id,
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
def get_calendar_endpoint(
    workspace_id: Optional[str] = None,
    espace_id: Optional[str] = None,
    liste_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _validate_search_scope(db, current_user.id, workspace_id=workspace_id, espace_id=espace_id, liste_id=liste_id)
    return get_team_calendar(
        db,
        current_user_id=current_user.id,
        workspace_id=workspace_id,
        espace_id=espace_id,
        liste_id=liste_id,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )


@router.get("/absences/{absence_id}", response_model=AbsenceEtCongeOut)
def get_absence_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return get_absence(db, absence_id=absence_id, current_user_id=current_user.id)


@router.put("/absences/{absence_id}", response_model=AbsenceEtCongeOut)
def update_absence_endpoint(
    absence_id: str,
    absence_in: AbsenceEtCongeUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return update_absence(
        db,
        absence_id=absence_id,
        current_user_id=current_user.id,
        **absence_in.model_dump(exclude_unset=True),
    )


@router.post("/absences/{absence_id}/approve", response_model=AbsenceEtCongeOut)
def approve_absence_endpoint(
    absence_id: str,
    decision: AbsenceDecisionRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return approve_leave(db, absence_id=absence_id, current_user_id=current_user.id, commentaire=decision.commentaire or decision.motif)


@router.post("/absences/{absence_id}/reject", response_model=AbsenceEtCongeOut)
def reject_absence_endpoint(
    absence_id: str,
    decision: AbsenceDecisionRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return reject_leave(db, absence_id=absence_id, current_user_id=current_user.id, motif_rejet=decision.motif or decision.commentaire)


@router.post("/absences/{absence_id}/cancel", response_model=AbsenceEtCongeOut)
def cancel_absence_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return cancel_leave(db, absence_id=absence_id, current_user_id=current_user.id)


@router.post("/absences/{absence_id}/finish", response_model=AbsenceEtCongeOut)
def finish_absence_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return finish_leave(db, absence_id=absence_id, current_user_id=current_user.id)


@router.get("/absences/{absence_id}/conflicts", response_model=List[AbsenceConflictOut])
def absence_conflicts_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return get_absence_conflicts(db, absence_id=absence_id, current_user_id=current_user.id)


@router.get("/absences/{absence_id}/impact", response_model=AbsenceImpactOut)
def absence_impact_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return get_absence_impact(db, absence_id=absence_id, current_user_id=current_user.id)


@router.post("/absences/availability/resource/{resource_id}", response_model=List[UserAvailabilityOut])
def list_availability_endpoint(
    resource_id: str,
    request: UserAvailabilityRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return get_user_availability(
        db, 
        resource_id=resource_id, 
        user_ids=request.user_ids, 
        reference_date=request.reference_date
    )


@router.delete("/absences/{absence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_absence_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    delete_absence(db, absence_id=absence_id, current_user_id=current_user.id)
    return None

# -----------------------------------------------------------------------------
# INVITATIONS DANS LES LISTES
# -----------------------------------------------------------------------------

@router.post("/{liste_id}/invite_member_liste", status_code=status.HTTP_201_CREATED)
def invite_liste_member(
    liste_id: str,
    membre_in: WorkspaceMemberInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Invite un utilisateur dans une liste via email et token (existant ou guest)."""
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    
    _require_list_member_management_access(db, liste_id, current_user.id)
    _, actor_role, actor_source_type, actor_source_id = _get_list_member_management_grant(
        db, liste_id, current_user.id
    )
    target_user = None
    if membre_in.email:
        target_user = db.query(Utilisateur).filter(Utilisateur.email == membre_in.email).first()
    elif membre_in.username:
        target_user = db.query(Utilisateur).filter(Utilisateur.username == membre_in.username).first()
    _validate_list_member_management_permissions(
        liste_id=liste_id,
        actor_role=actor_role,
        actor_source_type=actor_source_type,
        actor_source_id=actor_source_id,
        target_member=_get_liste_member_record(db, liste_id, target_user.id) if target_user else None,
        new_role=membre_in.role,
    )
    
    result = invite_member_to_liste(db, liste_id, membre_in)
    email_target = membre_in.email or membre_in.username
    
    if "membre" in result:
        membre = result["membre"]
        token = result["invitation_token"]
        recipient_email = membre.utilisateur.email if (membre.utilisateur and membre.utilisateur.email) else email_target
        target_name = membre.utilisateur.username if (membre.utilisateur and membre.utilisateur.username) else recipient_email
        
        background_tasks.add_task(
            send_liste_invitation_email,
            current_user.username,
            target_name,
            recipient_email,
            liste.nom,
            membre_in.role,
            token,
            is_guest=False
        )
        return {
            "status": "existing_user",
            "message": "Invitation envoyée à l'utilisateur existant.",
            "email": recipient_email,
            "membre": _serialize_member(membre)
        }
    else:
        token = result["token"]
        background_tasks.add_task(
            send_liste_invitation_email,
            current_user.username,
            email_target,
            email_target,
            liste.nom,
            membre_in.role,
            token,
            is_guest=True
        )
        return {
            "status": "guest_invitation",
            "message": "Invitation envoyée par lien (utilisateur non inscrit).",
            "email": email_target,
            "token": token
        }

@router.post("/invitations/accept", response_model=MembreOut)
def accept_liste_invitation_endpoint(
    invitation_in: dict,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Accepte une invitation à une liste (classique ou JWT guest)."""
    token = invitation_in.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token manquant")
    
    membre = accept_liste_invitation(
        db,
        user_id=current_user.id,
        invitation_token=token
    )
    return _serialize_member(membre)

@router.get("/invitations/accept-from-email")
def accept_liste_invitation_from_email(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Accepte une invitation à une liste directement depuis le lien email.
    Pas d'authentification requise — le token JWT contient le sub de l'utilisateur.
    """
    front_base_url = config_data.get("FRONT_BASE_URL", "http://localhost:5173")
    
    payload = decode_invitation_token(token)
    if not payload:
        return RedirectResponse(
            url=f"{front_base_url}/invitation/error?reason=invalid_token",
            status_code=302
        )
    
    user_id = payload.get("sub")
    if not user_id:
        return RedirectResponse(
            url=f"{front_base_url}/register?invitation_token={token}",
            status_code=302
        )
    
    target_liste_id = payload.get("liste_id")
    if target_liste_id:
        existing = get_liste_member_record(db, target_liste_id, user_id)
        if existing and existing.statut == "Actif":
            return RedirectResponse(
                url=f"{front_base_url}/invitation/accept?token={token}&status=already_member&type=liste",
                status_code=302
            )
    
    try:
        membre = accept_liste_invitation(db, user_id, token)
        return RedirectResponse(
            url=f"{front_base_url}/invitation/accept?token={token}&status=success&type=liste",
            status_code=302
        )
    except HTTPException as e:
        if e.status_code == 409:
            if isinstance(e.detail, str) and "Invitation non nécessaire" in e.detail:
                return RedirectResponse(
                    url=f"{front_base_url}/invitation/error?reason={quote(e.detail)}",
                    status_code=302
                )
            return RedirectResponse(
                url=f"{front_base_url}/invitation/accept?token={token}&status=already_member&type=liste",
                status_code=302
            )
        return RedirectResponse(
            url=f"{front_base_url}/invitation/error?reason={quote(str(e.detail))}",
            status_code=302
        )