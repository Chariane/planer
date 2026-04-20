from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime
from sqlalchemy import func
from ..models import Canevas, Section, Checklist, Tache

# --- CANEVAS CRUD ---

def get_canevas_by_id(db: Session, canevas_id: str) -> Optional[Canevas]:
    return db.query(Canevas).filter(Canevas.id == canevas_id).first()

def get_canevas_for_liste(db: Session, liste_id: str) -> Optional[Canevas]:
    return db.query(Canevas).filter(Canevas.id_liste == liste_id).first()

def create_canevas(db: Session, is_verrouille: bool = False, id_liste: Optional[str] = None) -> Canevas:
    canevas = Canevas(is_verrouille=is_verrouille, id_liste=id_liste)
    db.add(canevas)
    try:
        db.commit()
        db.refresh(canevas)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer le canevas.",
        ) from exc
    return canevas

def update_canevas(db: Session, canevas_id: str, **kwargs) -> Optional[Canevas]:
    canevas = get_canevas_by_id(db, canevas_id)
    if not canevas:
        return None
    for key, value in kwargs.items():
        if hasattr(canevas, key) and value is not None:
            setattr(canevas, key, value)
    canevas.updated_at = datetime.now()
    db.commit()
    db.refresh(canevas)
    return canevas

def delete_canevas(db: Session, canevas_id: str) -> bool:
    canevas = get_canevas_by_id(db, canevas_id)
    if canevas:
        db.delete(canevas)
        db.commit()
        return True
    return False

# --- SECTION CRUD ---

def get_section_by_id(db: Session, section_id: str) -> Optional[Section]:
    return db.query(Section).filter(Section.id == section_id).first()

def get_sections_for_canevas(db: Session, canevas_id: str) -> List[Section]:
    return db.query(Section).filter(Section.id_canevas == canevas_id).all()

def create_section(db: Session, titre: str, id_canevas: Optional[str] = None) -> Section:
    section = Section(titre=titre, id_canevas=id_canevas)
    db.add(section)
    try:
        db.commit()
        db.refresh(section)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer la section.",
        ) from exc
    return section

def update_section(db: Session, section_id: str, **kwargs) -> Optional[Section]:
    section = get_section_by_id(db, section_id)
    if not section:
        return None
    for key, value in kwargs.items():
        if hasattr(section, key) and value is not None:
            setattr(section, key, value)
    section.updated_at = datetime.now()
    db.commit()
    db.refresh(section)
    return section

def delete_section(db: Session, section_id: str) -> bool:
    section = get_section_by_id(db, section_id)
    if section:
        db.delete(section)
        db.commit()
        return True
    return False

# --- CHECKLIST CRUD ---

def get_checklist_by_id(db: Session, checklist_id: str) -> Optional[Checklist]:
    return db.query(Checklist).filter(Checklist.id == checklist_id).first()

def get_checklists_for_section(db: Session, section_id: str) -> List[Checklist]:
    return db.query(Checklist).filter(Checklist.id_section == section_id).all()

def get_checklists_for_tache(db: Session, tache_id: str) -> List[Checklist]:
    return db.query(Checklist).filter(Checklist.id_tache == tache_id).all()

def create_checklist(db: Session, texte: str, is_checked: bool = False, id_section: Optional[str] = None, id_tache: Optional[str] = None) -> Checklist:
    checklist = Checklist(texte=texte, is_checked=is_checked, id_section=id_section, id_tache=id_tache)
    db.add(checklist)
    try:
        db.commit()
        db.refresh(checklist)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer la checklist.",
        ) from exc
    return checklist

def update_checklist(db: Session, checklist_id: str, **kwargs) -> Optional[Checklist]:
    checklist = get_checklist_by_id(db, checklist_id)
    if not checklist:
        return None
    for key, value in kwargs.items():
        if hasattr(checklist, key) and value is not None:
            setattr(checklist, key, value)
    checklist.updated_at = datetime.now()
    db.commit()
    db.refresh(checklist)
    return checklist

def delete_checklist(db: Session, checklist_id: str) -> bool:
    checklist = get_checklist_by_id(db, checklist_id)
    if checklist:
        db.delete(checklist)
        db.commit()
        return True
    return False

# --- LOGIQUE D'AVANCEMENT ---

def calculate_task_progression(db: Session, tache_id: str) -> float:
    """Calcule le pourcentage de progression d'une tache base sur ses checklists."""
    total = db.query(func.count(Checklist.id)).filter(Checklist.id_tache == tache_id).scalar()
    if not total:
        return 0.0
    
    checked = db.query(func.count(Checklist.id)).filter(
        Checklist.id_tache == tache_id,
        Checklist.is_checked == True
    ).scalar()
    
    return round((checked / total) * 100, 2)
