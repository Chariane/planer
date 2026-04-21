from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_user
from ..core.function import (
    _get_workspace_or_404,
    _require_workspace_management_access,
    _require_workspace_member,
    _get_workspace_member_or_403,
    _get_espace_or_404,
    _require_espace_access,
    _get_liste_or_404,
    _require_list_access,
    _get_tache_or_404
)
from ..crud.liste import (
    create_liste,
    delete_liste,
    get_liste_by_id,
    get_listes_for_espace,
    get_listes_for_workspace,
    update_liste
)
from ..crud.tache import (
    create_tache,
    delete_tache,
    get_tache_by_id,
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
    create_checklist, get_checklists_for_section, get_checklists_for_tache, update_checklist, delete_checklist, get_checklist_by_id
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
    MessageResponse,
    MembreOut,
    CanevasOut, CanevasCreate, CanevasUpdate,
    SectionOut, SectionCreate, SectionUpdate,
    ChecklistOut, ChecklistCreate, ChecklistUpdate
)
from ..models import Tache

router = APIRouter(prefix="/listes", tags=["Listes & Tâches"])

# -----------------------------------------------------------------------------
# LISTES
# -----------------------------------------------------------------------------

@router.post("", response_model=ListeOut, status_code=status.HTTP_201_CREATED)
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
        _require_espace_access(db, liste_in.id_espace, current_user.id)
        
    return create_liste(
        db, 
        nom=liste_in.nom, 
        description=liste_in.description, 
        id_espace=liste_in.id_espace, 
        id_workspace=liste_in.id_workspace
    )

@router.get("", response_model=List[ListeOut])
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
        _get_workspace_member_or_403(db, workspace_id, current_user.id)
        return get_listes_for_workspace(db, workspace_id)
    else:
        _require_espace_access(db, espace_id, current_user.id)
        return get_listes_for_espace(db, espace_id)

@router.get("/{liste_id}", response_model=ListeOut)
def get_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_access(db, liste_id, current_user.id)
    return _get_liste_or_404(db, liste_id)

@router.put("/{liste_id}", response_model=ListeOut)
def update_liste_endpoint(
    liste_id: str,
    liste_in: ListeUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_access(db, liste_id, current_user.id)
    upd = update_liste(db, liste_id, **liste_in.model_dump(exclude_unset=True))
    if not upd:
        raise HTTPException(status_code=404, detail="Liste non trouvee")
    return upd

@router.delete("/{liste_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_access(db, liste_id, current_user.id)
    if not delete_liste(db, liste_id):
        raise HTTPException(status_code=404, detail="Liste non trouvee")
    return None

# -----------------------------------------------------------------------------
# TACHES
# -----------------------------------------------------------------------------

# Créer une tâche dans une liste, uniquement si l'utilisateur a accès à la liste
@router.post("/{liste_id}/taches", response_model=TacheOut, status_code=status.HTTP_201_CREATED)
def create_tache_endpoint(
    liste_id: str,
    tache_in: TacheCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_access(db, liste_id, current_user.id)
    return create_tache(db, **tache_in.model_dump(exclude={"id_liste"}), id_liste=liste_id)

# Lister les tâches d'une liste, uniquement si l'utilisateur a accès à la liste
@router.get("/{liste_id}/taches", response_model=List[TacheFullOut])
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
    _require_list_access(db, liste_id, current_user.id)
    return get_taches_for_liste(
        db, liste_id, 
        statut=statut, 
        priorite=priorite, 
        membre_id=membre_id, 
        sort_by=sort_by, 
        order=order
    )

# Récupérer les détails d'une tâche, uniquement si l'utilisateur a accès à la liste parente
@router.get("/taches/{tache_id}", response_model=TacheOut)
def get_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_user.id)
    return tache

# Modifier une tâche, uniquement si l'utilisateur a accès à la liste parente
@router.put("/taches/{tache_id}", response_model=TacheOut)
def update_tache_endpoint(
    tache_id: str,
    tache_in: TacheUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_user.id)
    return update_tache(db, tache_id, **tache_in.model_dump(exclude_unset=True))

# Supprimer une tâche, uniquement si l'utilisateur a accès à la liste parente
@router.delete("/taches/{tache_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_user.id)
    delete_tache(db, tache_id)
    return None



# Des endpoints dédiés pour récupérer les tâches d'une liste dans des formats adaptés à différentes vues (Kanban, Gantt, Tableau), avec les mêmes vérifications d'accès que pour les tâches classiques.

#vue kanban : colonnes avec leurs tâches
@router.get("/{liste_id}/vues/kanban", response_model=TacheKanbanOut)
def get_kanban_view_endpoint(
    liste_id: str, 
    db: Session = Depends(get_db), 
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_access(db, liste_id, current_user.id)
    return {"columns": get_taches_kanban(db, liste_id)}

#vue gantt : liste des tâches triées par date de début
@router.get("/{liste_id}/vues/gantt", response_model=List[TacheFullOut])
def get_gantt_view_endpoint(
    liste_id: str, 
    db: Session = Depends(get_db), 
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_access(db, liste_id, current_user.id)
    # Tri chronologique pour le diagramme de Gantt
    return get_taches_for_liste(db, liste_id, sort_by="date_debut", order="asc")

#vue tableau : liste des tâches avec possibilité de filtrer et trier par différents champs
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
    _require_list_access(db, liste_id, current_user.id)
    return get_taches_for_liste(
        db, liste_id, 
        statut=statut, 
        priorite=priorite, 
        membre_id=membre_id, 
        sort_by=sort_by, 
        order=order
    )


# Mise à jour groupée de tâches (ex: pour réordonner les tâches d'une liste), uniquement si l'utilisateur a accès à la liste parente de la première tâche du lot
@router.patch("/taches/bulk", response_model=MessageResponse)
def bulk_update_taches_endpoint(
    bulk_in: TacheBulkUpdate, 
    db: Session = Depends(get_db), 
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not bulk_in.items:
        return {"message": "Aucune modification fournie"}
    
    # Sécurité : On vérifie l'accès sur la première tâche du lot
    first_tache = _get_tache_or_404(db, bulk_in.items[0].id)
    _require_list_access(db, first_tache.id_liste, current_user.id)
    
    if update_taches_bulk(db, [it.model_dump(exclude_unset=True) for it in bulk_in.items]):
        return {"message": "Mise à jour groupée réussie"}
    else:
        raise HTTPException(status_code=400, detail="Échec de la mise à jour groupée")


#Assigner une tâche à un membre, uniquement si l'utilisateur a accès à la liste parente de la tâche
@router.post("/taches/{tache_id}/assign/{utilisateur_id}", response_model=MembreOut)
def assign_tache_endpoint(
    tache_id: str,
    utilisateur_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_user.id)
    return assign_member_to_tache(db, tache_id, utilisateur_id)

#Désassigner une tâche d'un membre, uniquement si l'utilisateur a accès à la liste parente de la tâche
@router.delete("/taches/{tache_id}/unassign/{utilisateur_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_tache_endpoint(
    tache_id: str,
    utilisateur_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_user.id)
    unassign_member_from_tache(db, tache_id, utilisateur_id)
    return None

@router.get("/taches/{tache_id}/members", response_model=List[MembreOut])
def get_tache_members_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_user.id)
    return get_tache_members(db, tache_id)

# -----------------------------------------------------------------------------
# CANEVAS, SECTIONS, CHECKLISTS (Gardés pour compatibilité logicielle)
# -----------------------------------------------------------------------------

@router.post("/{liste_id}/canevas", response_model=CanevasOut)
def create_canevas_endpoint(liste_id: str, canevas_in: CanevasCreate, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    _require_list_access(db, liste_id, current_user.id)
    return create_canevas(db, is_verrouille=canevas_in.is_verrouille, id_liste=liste_id)

@router.get("/{liste_id}/canevas", response_model=CanevasOut)
def get_canevas_endpoint(liste_id: str, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    _require_list_access(db, liste_id, current_user.id)
    res = get_canevas_for_liste(db, liste_id)
    if not res: raise HTTPException(404, "Canevas non trouve")
    return res

@router.post("/sections/{canevas_id}", response_model=SectionOut)
def create_section_endpoint(canevas_id: str, section_in: SectionCreate, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    canevas = get_canevas_by_id(db, canevas_id)
    if not canevas: raise HTTPException(404, "Canevas non trouve")
    _require_list_access(db, canevas.id_liste, current_user.id)
    return create_section(db, titre=section_in.titre, id_canevas=canevas_id)

@router.post("/checklists/{parent_id}", response_model=ChecklistOut)
def create_checklist_endpoint(parent_id: str, checklist_in: ChecklistCreate, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    """parent_id peut etre id_section ou id_tache selon le JSON."""
    if checklist_in.id_tache:
        tache = _get_tache_or_404(db, checklist_in.id_tache)
        _require_list_access(db, tache.id_liste, current_user.id)
    elif checklist_in.id_section:
        sec = get_section_by_id(db, checklist_in.id_section)
        if not sec: raise HTTPException(404, "Section non trouvee")
        can = get_canevas_by_id(db, sec.id_canevas)
        _require_list_access(db, can.id_liste, current_user.id)
    
    return create_checklist(db, **checklist_in.model_dump())
@router.get("/checklists/tache/{tache_id}", response_model=List[ChecklistOut])
def get_checklists_for_tache_endpoint(tache_id: str, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_user.id)
    return get_checklists_for_tache(db, tache_id)

@router.put("/checklists/{checklist_id}", response_model=ChecklistOut)
def update_checklist_endpoint(checklist_id: str, checklist_in: ChecklistUpdate, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    chk = get_checklist_by_id(db, checklist_id)
    if not chk: raise HTTPException(404, "Checklist non trouvee")
    
    if chk.id_tache:
        tache = _get_tache_or_404(db, chk.id_tache)
        _require_list_access(db, tache.id_liste, current_user.id)
    elif chk.id_section:
        sec = get_section_by_id(db, chk.id_section)
        can = get_canevas_by_id(db, sec.id_canevas)
        _require_list_access(db, can.id_liste, current_user.id)
        
    return update_checklist(db, checklist_id, **checklist_in.model_dump(exclude_unset=True))

@router.delete("/checklists/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_endpoint(checklist_id: str, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    chk = get_checklist_by_id(db, checklist_id)
    if not chk: raise HTTPException(404, "Checklist non trouvee")
    
    if chk.id_tache:
        tache = _get_tache_or_404(db, chk.id_tache)
        _require_list_access(db, tache.id_liste, current_user.id)
    elif chk.id_section:
        sec = get_section_by_id(db, chk.id_section)
        can = get_canevas_by_id(db, sec.id_canevas)
        _require_list_access(db, can.id_liste, current_user.id)
        
    delete_checklist(db, checklist_id)
    return None

@router.get("/sections/{canevas_id}", response_model=List[SectionOut])
def get_sections_endpoint(canevas_id: str, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    can = get_canevas_by_id(db, canevas_id)
    if not can: raise HTTPException(404, "Canevas non trouve")
    _require_list_access(db, can.id_liste, current_user.id)
    return get_sections_for_canevas(db, canevas_id)

@router.put("/sections/{section_id}", response_model=SectionOut)
def update_section_endpoint(section_id: str, section_in: SectionUpdate, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    sec = get_section_by_id(db, section_id)
    if not sec: raise HTTPException(404, "Section non trouvee")
    can = get_canevas_by_id(db, sec.id_canevas)
    _require_list_access(db, can.id_liste, current_user.id)
    return update_section(db, section_id, **section_in.model_dump(exclude_unset=True))

@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section_endpoint(section_id: str, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    sec = get_section_by_id(db, section_id)
    if not sec: raise HTTPException(404, "Section non trouvee")
    can = get_canevas_by_id(db, sec.id_canevas)
    _require_list_access(db, can.id_liste, current_user.id)
    delete_section(db, section_id)
    return None

@router.put("/canevas/{canevas_id}", response_model=CanevasOut)
def update_canevas_endpoint(canevas_id: str, canevas_in: CanevasUpdate, db: Session = Depends(get_db), current_user: UtilisateurOut = Depends(get_current_user)):
    can = get_canevas_by_id(db, canevas_id)
    if not can: raise HTTPException(404, "Canevas non trouve")
    _require_list_access(db, can.id_liste, current_user.id)
    return update_canevas(db, canevas_id, **canevas_in.model_dump(exclude_unset=True))
