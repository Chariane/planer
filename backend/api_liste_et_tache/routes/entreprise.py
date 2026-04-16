from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_active_entreprise
from ..core.function import (
    _get_workspace_or_404,
    _require_workspace_management_access,
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
    get_taches_for_liste,
    update_tache,
    assign_member_to_tache,
    unassign_member_from_tache,
    get_tache_members
)

from ..schemas import (
    ListeCreate, ListeOut, ListeUpdate,
    TacheCreate, TacheOut, TacheUpdate,
    MembreOut, UtilisateurOut
)

router = APIRouter(prefix="/entreprise/listes", tags=["Entreprise Listes & Tâches"])

# -----------------------------------------------------------------------------
# LISTES
# -----------------------------------------------------------------------------

@router.post("", response_model=ListeOut, status_code=status.HTTP_201_CREATED)
def create_entreprise_liste_endpoint(
    liste_in: ListeCreate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    """Créer une liste (contexte entreprise)."""
    if liste_in.id_workspace:
        _get_workspace_or_404(db, liste_in.id_workspace)
        _require_workspace_management_access(db, liste_in.id_workspace, current_entreprise.id)
    else:
        _require_espace_access(db, liste_in.id_espace, current_entreprise.id)
        
    return create_liste(
        db, 
        nom=liste_in.nom, 
        description=liste_in.description, 
        id_espace=liste_in.id_espace, 
        id_workspace=liste_in.id_workspace
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
        _get_workspace_member_or_403(db, workspace_id, current_entreprise.id)
        return get_listes_for_workspace(db, workspace_id)
    else:
        _require_espace_access(db, espace_id, current_entreprise.id)
        return get_listes_for_espace(db, espace_id)

@router.get("/{liste_id}", response_model=ListeOut)
def get_entreprise_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_access(db, liste_id, current_entreprise.id)
    return _get_liste_or_404(db, liste_id)

@router.put("/{liste_id}", response_model=ListeOut)
def update_entreprise_liste_endpoint(
    liste_id: str,
    liste_in: ListeUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_access(db, liste_id, current_entreprise.id)
    return update_liste(db, liste_id, **liste_in.model_dump(exclude_unset=True))

@router.delete("/{liste_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entreprise_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_access(db, liste_id, current_entreprise.id)
    delete_liste(db, liste_id)
    return None

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
    _require_list_access(db, liste_id, current_entreprise.id)
    return create_tache(db, **tache_in.model_dump(), id_liste=liste_id)

@router.get("/{liste_id}/taches", response_model=List[TacheOut])
def get_entreprise_taches_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    _require_list_access(db, liste_id, current_entreprise.id)
    return get_taches_for_liste(db, liste_id)

@router.put("/taches/{tache_id}", response_model=TacheOut)
def update_entreprise_tache_endpoint(
    tache_id: str,
    tache_in: TacheUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_entreprise.id)
    return update_tache(db, tache_id, **tache_in.model_dump(exclude_unset=True))

@router.delete("/taches/{tache_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entreprise_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_entreprise.id)
    delete_tache(db, tache_id)
    return None

# --- Assignations ---

@router.post("/taches/{tache_id}/assign/{utilisateur_id}", response_model=MembreOut)
def assign_entreprise_tache_endpoint(
    tache_id: str,
    utilisateur_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_entreprise.id)
    return assign_member_to_tache(db, tache_id, utilisateur_id)

@router.get("/taches/{tache_id}/members", response_model=List[MembreOut])
def get_entreprise_tache_members_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise)
):
    tache = _get_tache_or_404(db, tache_id)
    _require_list_access(db, tache.id_liste, current_entreprise.id)
    return get_tache_members(db, tache_id)
