from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..schemas import ChecklistCreate, ChecklistOut, ChecklistUpdate
from ..security import get_current_user
from ..crud.checklist_crud import (
    get_checklist_by_id,
    get_checklists_by_tache,
    create_checklist,
    update_checklist,
    delete_checklist
)
from ..crud.tache_crud import get_tache_by_id
from .taches import check_liste_access  # on peut mutualiser cette fonction

router = APIRouter(prefix="/checklists", tags=["Checklists"])

@router.post("", response_model=ChecklistOut, status_code=status.HTTP_201_CREATED)
def create_checklist_endpoint(
    data: ChecklistCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    tache = get_tache_by_id(db, data.id_tache)
    if not tache:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    check_liste_access(db, tache.id_liste, current_user.id)
    new_checklist = create_checklist(db, data.texte, data.id_tache, data.is_checked)
    return new_checklist

@router.get("/{checklist_id}", response_model=ChecklistOut)
def get_checklist(
    checklist_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    checklist = get_checklist_by_id(db, checklist_id)
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist non trouvée")
    tache = get_tache_by_id(db, checklist.id_tache)
    check_liste_access(db, tache.id_liste, current_user.id)
    return checklist

@router.put("/{checklist_id}", response_model=ChecklistOut)
def update_checklist_endpoint(
    checklist_id: str,
    data: ChecklistUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    checklist = get_checklist_by_id(db, checklist_id)
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist non trouvée")
    tache = get_tache_by_id(db, checklist.id_tache)
    check_liste_access(db, tache.id_liste, current_user.id)
    updated = update_checklist(db, checklist_id, data.texte, data.is_checked)
    return updated

@router.delete("/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_endpoint(
    checklist_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    checklist = get_checklist_by_id(db, checklist_id)
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist non trouvée")
    tache = get_tache_by_id(db, checklist.id_tache)
    check_liste_access(db, tache.id_liste, current_user.id)
    if not delete_checklist(db, checklist_id):
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")
    return None