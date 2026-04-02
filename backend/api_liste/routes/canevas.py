from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..models import Canevas, Section, Checklist
from ..database import get_db
from ..schemas import (
    CanevasCreate, CanevasOut, CanevasUpdate,
    SectionCreate, SectionOut, SectionUpdate,
    ChecklistCreate, ChecklistOut, ChecklistUpdate
)
from ..security import get_current_user
from ..crud.liste_crud import get_liste_by_id
from .taches import check_liste_access  # fonction d'accès aux listes

router = APIRouter(prefix="/canevas", tags=["Canevas"])


# ========== Gestion du canevas d'une liste ==========
@router.get("/listes/{liste_id}", response_model=CanevasOut)
def get_canevas_by_liste(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    check_liste_access(db, liste_id, current_user.id)
    canevas = db.query(Canevas).filter(Canevas.id_liste == liste_id).first()
    if not canevas:
        raise HTTPException(status_code=404, detail="Aucun canevas associé à cette liste")
    # Charger sections et checklists
    sections = db.query(Section).filter(Section.id_canevas == canevas.id).all()
    for section in sections:
        section.checklists = db.query(Checklist).filter(Checklist.id_section == section.id).all()
    canevas.sections = sections
    return canevas


@router.post("/listes/{liste_id}", response_model=CanevasOut, status_code=status.HTTP_201_CREATED)
def create_canevas_for_liste(
    liste_id: str,
    data: CanevasCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    check_liste_access(db, liste_id, current_user.id)
    # Vérifier que la liste n'a pas déjà un canevas
    existing = db.query(Canevas).filter(Canevas.id_liste == liste_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un canevas existe déjà pour cette liste")
    new_canevas = Canevas(
        is_verrouille=data.is_verrouille,
        id_liste=liste_id
    )
    db.add(new_canevas)
    db.commit()
    db.refresh(new_canevas)
    return new_canevas


@router.put("/listes/{liste_id}", response_model=CanevasOut)
def update_canevas_for_liste(
    liste_id: str,
    data: CanevasUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    check_liste_access(db, liste_id, current_user.id)
    canevas = db.query(Canevas).filter(Canevas.id_liste == liste_id).first()
    if not canevas:
        raise HTTPException(status_code=404, detail="Aucun canevas associé à cette liste")
    if data.is_verrouille is not None:
        canevas.is_verrouille = data.is_verrouille
    db.commit()
    db.refresh(canevas)
    return canevas


# ========== Sections ==========
@router.post("/canevas/{canevas_id}/sections", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
def create_section(
    canevas_id: str,
    data: SectionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    canevas = db.query(Canevas).filter(Canevas.id == canevas_id).first()
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas non trouvé")
    # Vérifier accès via la liste
    check_liste_access(db, canevas.id_liste, current_user.id)
    new_section = Section(titre=data.titre, id_canevas=canevas_id)
    db.add(new_section)
    db.commit()
    db.refresh(new_section)
    return new_section


@router.put("/sections/{section_id}", response_model=SectionOut)
def update_section(
    section_id: str,
    data: SectionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section non trouvée")
    canevas = db.query(Canevas).filter(Canevas.id == section.id_canevas).first()
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas parent non trouvé")
    check_liste_access(db, canevas.id_liste, current_user.id)
    if data.titre is not None:
        section.titre = data.titre
    db.commit()
    db.refresh(section)
    return section


@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(
    section_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section non trouvée")
    canevas = db.query(Canevas).filter(Canevas.id == section.id_canevas).first()
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas parent non trouvé")
    check_liste_access(db, canevas.id_liste, current_user.id)
    db.delete(section)
    db.commit()
    return None


# ========== Checklists dans les sections ==========
@router.post("/sections/{section_id}/checklists", response_model=ChecklistOut, status_code=status.HTTP_201_CREATED)
def create_checklist_in_section(
    section_id: str,
    data: ChecklistCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section non trouvée")
    canevas = db.query(Canevas).filter(Canevas.id == section.id_canevas).first()
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas parent non trouvé")
    check_liste_access(db, canevas.id_liste, current_user.id)
    new_checklist = Checklist(
        texte=data.texte,
        is_checked=False,          # les checklists de canevas ne sont pas cochées par défaut
        id_section=section_id,
        id_tache=None
    )
    db.add(new_checklist)
    db.commit()
    db.refresh(new_checklist)
    return new_checklist


@router.put("/checklists/{checklist_id}", response_model=ChecklistOut)
def update_checklist_in_canevas(
    checklist_id: str,
    data: ChecklistUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id, Checklist.id_section.isnot(None)).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist de canevas non trouvée")
    section = db.query(Section).filter(Section.id == checklist.id_section).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section parente non trouvée")
    canevas = db.query(Canevas).filter(Canevas.id == section.id_canevas).first()
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas parent non trouvé")
    check_liste_access(db, canevas.id_liste, current_user.id)
    if data.texte is not None:
        checklist.texte = data.texte
    db.commit()
    db.refresh(checklist)
    return checklist


@router.delete("/checklists/{checklist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_checklist_in_canevas(
    checklist_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    checklist = db.query(Checklist).filter(Checklist.id == checklist_id, Checklist.id_section.isnot(None)).first()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist de canevas non trouvée")
    section = db.query(Section).filter(Section.id == checklist.id_section).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section parente non trouvée")
    canevas = db.query(Canevas).filter(Canevas.id == section.id_canevas).first()
    if not canevas:
        raise HTTPException(status_code=404, detail="Canevas parent non trouvé")
    check_liste_access(db, canevas.id_liste, current_user.id)
    db.delete(checklist)
    db.commit()
    return None