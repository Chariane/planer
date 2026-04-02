from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Checklist, Tache

def get_checklist_by_id(db: Session, checklist_id: str) -> Optional[Checklist]:
    return db.query(Checklist).filter(Checklist.id == checklist_id).first()

def get_checklists_by_tache(db: Session, tache_id: str) -> List[Checklist]:
    return db.query(Checklist).filter(Checklist.id_tache == tache_id).all()

def create_checklist(db: Session, texte: str, id_tache: str, is_checked: bool = False) -> Checklist:
    checklist = Checklist(texte=texte, id_tache=id_tache, is_checked=is_checked)
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist

def update_checklist(db: Session, checklist_id: str, texte: str = None, is_checked: bool = None) -> Checklist:
    checklist = get_checklist_by_id(db, checklist_id)
    if checklist:
        if texte is not None:
            checklist.texte = texte
        if is_checked is not None:
            checklist.is_checked = is_checked
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