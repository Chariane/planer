from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from api_gateway.models import Utilisateur
from api_gateway.security import get_current_user, check_workspace_role
from ..database import get_db
from ..schemas import (
    ListeCreate, ListeOut, ListeUpdate,
    TacheCreate, TacheOut, TacheUpdate,
    CanevasCreate, CanevasOut, CanevasUpdate,
    SectionCreate, SectionOut, SectionUpdate,
    ChecklistCreate, ChecklistOut, ChecklistUpdate,
    UtilisateurOut
)
from ..crud.liste_crud import (
    get_liste_by_id, get_listes_for_espace, get_listes_for_workspace, create_liste, update_liste, delete_liste,
    get_tache_by_id, get_taches_for_liste, create_tache, update_tache, delete_tache,
    get_canevas_by_id, get_canevas_for_liste, create_canevas, update_canevas, delete_canevas,
    get_section_by_id, get_sections_for_canevas, create_section, update_section, delete_section,
    get_checklist_by_id, get_checklists_for_section, get_checklists_for_tache, create_checklist, update_checklist, delete_checklist
)

router = APIRouter(prefix="/listes", tags=["Listes"])

# Listes
@router.post("", response_model=ListeOut, status_code=status.HTTP_201_CREATED)
def create_liste_endpoint(
    liste_in: ListeCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    # Vérifier que l'utilisateur est membre du workspace
    if not check_workspace_role(db, current_user.id, liste_in.id_workspace):
        raise HTTPException(status_code=403, detail="Accès refusé au workspace")
    
    new_liste = create_liste(db, liste_in.nom, liste_in.description, liste_in.id_espace, liste_in.id_workspace)
    return new_liste

@router.get("", response_model=List[ListeOut])
def get_listes_endpoint(
    espace_id: str = None,
    workspace_id: str = None,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if espace_id:
        # Vérifier accès à l'espace (qui appartient à un workspace)
        espace = db.query(Espace).filter(Espace.id == espace_id).first()
        if not espace:
            raise HTTPException(status_code=404, detail="Espace non trouvé")
        if not check_workspace_role(db, current_user.id, espace.id_workspace):
            raise HTTPException(status_code=403, detail="Accès refusé")
        listes = get_listes_for_espace(db, espace_id)
    elif workspace_id:
        if not check_workspace_role(db, current_user.id, workspace_id):
            raise HTTPException(status_code=403, detail="Accès refusé au workspace")
        listes = get_listes_for_workspace(db, workspace_id)
    else:
        raise HTTPException(status_code=400, detail="Spécifiez espace_id ou workspace_id")
    return listes

@router.get("/{liste_id}", response_model=ListeOut)
def get_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    return liste

@router.put("/{liste_id}", response_model=ListeOut)
def update_liste_endpoint(
    liste_id: str,
    liste_in: ListeUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    liste = update_liste(db, liste_id, liste_in.nom, liste_in.description, liste_in.id_espace, liste_in.id_workspace)
    if not liste:
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    return liste

@router.delete("/{liste_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_liste_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not delete_liste(db, liste_id):
        raise HTTPException(status_code=404, detail="Liste non trouvée")
    return None

# Tâches
@router.post("/{liste_id}/taches", response_model=TacheOut, status_code=status.HTTP_201_CREATED)
def create_tache_endpoint(
    liste_id: str,
    tache_in: TacheCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_tache = create_tache(
        db, tache_in.titre, tache_in.description, tache_in.date_debut, tache_in.date_fin_prevue,
        tache_in.date_fin_reelle, tache_in.statut, tache_in.priorite, tache_in.progression,
        tache_in.commentaires, liste_id
    )
    return new_tache

@router.get("/{liste_id}/taches", response_model=List[TacheOut])
def get_taches_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    taches = get_taches_for_liste(db, liste_id)
    return taches

@router.get("/taches/{tache_id}", response_model=TacheOut)
def get_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    tache = get_tache_by_id(db, tache_id)
    if not tache:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return tache

@router.put("/taches/{tache_id}", response_model=TacheOut)
def update_tache_endpoint(
    tache_id: str,
    tache_in: TacheUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    update_data = tache_in.model_dump(exclude_unset=True)
    tache = update_tache(db, tache_id, **update_data)
    if not tache:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return tache

@router.delete("/taches/{tache_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not delete_tache(db, tache_id):
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return None

# Canevas
@router.post("/{liste_id}/canevas", response_model=CanevasOut, status_code=status.HTTP_201_CREATED)
def create_canevas_endpoint(
    liste_id: str,
    canevas_in: CanevasCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_canevas = create_canevas(db, canevas_in.nom, canevas_in.description, liste_id)
    return new_canevas

@router.get("/{liste_id}/canevas", response_model=CanevasOut)
def get_canevas_endpoint(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    canevas = get_canevas_for_liste(db, liste_id)
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas non trouvé")
    return canevas

@router.put("/canevas/{canevas_id}", response_model=CanevasOut)
def update_canevas_endpoint(
    canevas_id: str,
    canevas_in: CanevasUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    canevas = update_canevas(db, canevas_id, canevas_in.nom, canevas_in.description, canevas_in.id_liste)
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas non trouvé")
    return canevas

@router.delete("/canevas/{canevas_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_canevas_endpoint(
    canevas_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not delete_canevas(db, canevas_id):
        raise HTTPException(status_code=404, detail="Canevas non trouvé")
    return None

# Sections
@router.post("/canevas/{canevas_id}/sections", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def create_section_endpoint(
    canevas_id: str,
    section_in: SectionCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_section = create_section(db, section_in.titre, section_in.description, section_in.ordre, canevas_id)
    return new_section

@router.get("/canevas/{canevas_id}/sections", response_model=List[SectionOut])
def get_sections_endpoint(
    canevas_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    sections = get_sections_for_canevas(db, canevas_id)
    return sections

@router.put("/sections/{section_id}", response_model=SectionOut)
def update_section_endpoint(
    section_id: str,
    section_in: SectionUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    section = update_section(db, section_id, section_in.titre, section_in.description, section_in.ordre, section_in.id_canevas)
    if not section:
        raise HTTPException(status_code=404, detail="Section non trouvée")
    return section

@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section_endpoint(
    section_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not delete_section(db, section_id):
        raise HTTPException(status_code=404, detail="Section non trouvée")
    return None

# Checklists
@router.post("/sections/{section_id}/checklists", response_model=ChecklistOut, status_code=status.HTTP_201_CREATED)
def create_checklist_for_section_endpoint(
    section_id: str,
    checklist_in: ChecklistCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_checklist = create_checklist(db, checklist_in.titre, checklist_in.description, checklist_in.is_checked, checklist_in.ordre, section_id, checklist_in.id_tache)
    return new_checklist

@router.post("/taches/{tache_id}/checklists", response_model=ChecklistOut, status_code=status.HTTP_201_CREATED)
def create_checklist_for_tache_endpoint(
    tache_id: str,
    checklist_in: ChecklistCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_checklist = create_checklist(db, checklist_in.titre, checklist_in.description, checklist_in.is_checked, checklist_in.ordre, checklist_in.id_section, tache_id)
    return new_checklist

@router.get("/sections/{section_id}/checklists", response_model=List[ChecklistOut])
def get_checklists_for_section_endpoint(
    section_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    checklists = get_checklists_for_section(db, section_id)
    return checklists

@router.get("/taches/{tache_id}/checklists", response_model=List[ChecklistOut])
def get_checklists_for_tache_endpoint(
    tache_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    checklists = get_checklists_for_tache(db, tache_id)
    return checklists

@router.put("/checklists/{checklist_id}", response_model=ChecklistOut)
def update_checklist_endpoint(
    checklist_id: str,
    checklist_in: ChecklistUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    checklist = update_checklist(db, checklist_id, checklist_in.titre, checklist_in.description, checklist_in.is_checked, checklist_in.ordre, checklist_in.id_section, checklist_in.id_tache)
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist non trouvée")
    return checklist

@router.delete("/checklists/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_endpoint(
    checklist_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not delete_checklist(db, checklist_id):
        raise HTTPException(status_code=404, detail="Checklist non trouvée")
    return None