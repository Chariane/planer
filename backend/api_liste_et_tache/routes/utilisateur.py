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
    get_tache_members
)
# Pour Canevas, Section, Checklist, on garde temporairement crud/utilisateur.py ou on les déplacera plus tard
from ..crud.utilisateur import (
    create_canevas, get_canevas_for_liste, update_canevas, delete_canevas, get_canevas_by_id,
    create_section, get_sections_for_canevas, update_section, delete_section, get_section_by_id,
    create_checklist, get_checklists_for_section, get_checklists_for_tache, update_checklist, delete_checklist, get_checklist_by_id
)

from ..schemas import (
    ListeCreate, ListeOut, ListeUpdate,
    TacheCreate, TacheOut, TacheUpdate,
    CanevasOut, CanevasCreate, CanevasUpdate,
    SectionOut, SectionCreate, SectionUpdate,
    ChecklistOut, ChecklistCreate, ChecklistUpdate,
    MembreOut, UtilisateurOut
)

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

@router.post("/{liste_id}/taches", response_model=TacheOut, status_code=status.HTTP_201_CREATED)
def create_tache_endpoint(
    liste_id: str,
    tache_in: TacheCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_access(db, liste_id, current_user.id)
    return create_tache(db, **tache_in.model_dump(), id_liste=liste_id)

@router.get("/{liste_id}/taches", response_model=List[TacheOut])
def get_taches_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_list_access(db, liste_id, current_user.id)
    return get_taches_for_liste(db, liste_id)

@router.get("/taches/{tache_id}", response_model=TacheOut)
def get_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_user.id)
    return tache

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

# --- Assignations ---

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
