from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from ..models import Liste

def get_liste_by_id(db: Session, liste_id: str) -> Optional[Liste]:
    return db.query(Liste).filter(Liste.id == liste_id).first()


def get_listes_for_workspace(db: Session, workspace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_workspace == workspace_id).all()


def get_listes_for_espace(db: Session, espace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_espace == espace_id).all()


def create_liste(db: Session, nom: str, description: str = None, id_espace: str = None, id_workspace: str = None) -> Liste:
    liste = Liste(
        nom=nom, 
        description=description, 
        id_espace=id_espace, 
        id_workspace=id_workspace
    )
    db.add(liste)
    try:
        db.commit()
        db.refresh(liste)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer la liste (conflit d'integrite ou mauvais rattachement).",
        ) from exc
    return liste


def update_liste(db: Session, liste_id: str, **kwargs) -> Optional[Liste]:
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        return None
    
    for key, value in kwargs.items():
        if hasattr(liste, key):
            setattr(liste, key, value)
            
    try:
        db.commit()
        db.refresh(liste)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de mettre a jour la liste.",
        ) from exc
    return liste


def delete_liste(db: Session, liste_id: str) -> bool:
    liste = get_liste_by_id(db, liste_id)
    if not liste:
        return False
    
    db.delete(liste)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la suppression de la liste.",
        )
    return True
