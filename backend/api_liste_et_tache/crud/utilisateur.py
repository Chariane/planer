from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime

from ..models import Liste, Tache, Canevas, Section, Checklist

# Liste CRUD
def get_liste_by_id(db: Session, liste_id: str) -> Optional[Liste]:
    return db.query(Liste).filter(Liste.id == liste_id).first()

def get_listes_for_espace(db: Session, espace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_espace == espace_id).all()

def get_listes_for_workspace(db: Session, workspace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_workspace == workspace_id).all()

def create_liste(db: Session, nom: str, description: str = None, id_espace: str = None, id_workspace: str = None) -> Liste:
    liste = Liste(nom=nom, description=description, id_espace=id_espace, id_workspace=id_workspace)
    db.add(liste)
    try:
        db.commit()
        db.refresh(liste)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer la liste a cause d'une contrainte d'integrite.",
        ) from exc
    return liste

def update_liste(db: Session, liste_id: str, nom: str = None, description: str = None, id_espace: str = None, id_workspace: str = None) -> Liste:
    liste = get_liste_by_id(db, liste_id)
    if liste:
        if nom is not None:
            liste.nom = nom
        if description is not None:
            liste.description = description
        if id_espace is not None:
            liste.id_espace = id_espace
        if id_workspace is not None:
            liste.id_workspace = id_workspace
        db.commit()
        db.refresh(liste)
    return liste

def delete_liste(db: Session, liste_id: str) -> bool:
    liste = get_liste_by_id(db, liste_id)
    if liste:
        db.delete(liste)
        db.commit()
        return True
    return False

# Tache CRUD
def get_tache_by_id(db: Session, tache_id: str) -> Optional[Tache]:
    return db.query(Tache).filter(Tache.id == tache_id).first()

def get_taches_for_liste(db: Session, liste_id: str) -> List[Tache]:
    return db.query(Tache).filter(Tache.id_liste == liste_id).all()

def create_tache(
    db: Session,
    titre: str,
    description: Optional[str] = None,
    date_debut: Optional[datetime] = None,
    date_fin_prevue: Optional[datetime] = None,
    statut: Optional[str] = None,
    priorite: Optional[str] = None,
    ordre_affichage: Optional[int] = None,
    id_liste: Optional[str] = None,
) -> Tache:
    tache = Tache(
        titre=titre,
        description=description,
        date_debut=date_debut,
        date_fin_prevue=date_fin_prevue,
        statut=statut,
        priorite=priorite,
        ordre_affichage=ordre_affichage,
        id_liste=id_liste,
    )
    db.add(tache)
    try:
        db.commit()
        db.refresh(tache)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de creer la tache a cause d'une contrainte d'integrite.",
        ) from exc
    return tache

def update_tache(db: Session, tache_id: str, **kwargs) -> Optional[Tache]:
    tache = get_tache_by_id(db, tache_id)
    if tache:
        for key, value in kwargs.items():
            if value is not None:
                setattr(tache, key, value)
        db.commit()
        db.refresh(tache)
    return tache

def delete_tache(db: Session, tache_id: str) -> bool:
    tache = get_tache_by_id(db, tache_id)
    if tache:
        db.delete(tache)
        db.commit()
        return True
    return False

# Canevas CRUD
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
            detail="Impossible de creer le canevas a cause d'une contrainte d'integrite.",
        ) from exc
    return canevas

def update_canevas(db: Session, canevas_id: str, is_verrouille: Optional[bool] = None, id_liste: Optional[str] = None) -> Optional[Canevas]:
    canevas = get_canevas_by_id(db, canevas_id)
    if canevas:
        if is_verrouille is not None:
            canevas.is_verrouille = is_verrouille
        if id_liste is not None:
            canevas.id_liste = id_liste
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

# Section CRUD
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
            detail="Impossible de creer la section a cause d'une contrainte d'integrite.",
        ) from exc
    return section

def update_section(db: Session, section_id: str, titre: Optional[str] = None, id_canevas: Optional[str] = None) -> Optional[Section]:
    section = get_section_by_id(db, section_id)
    if section:
        if titre is not None:
            section.titre = titre
        if id_canevas is not None:
            section.id_canevas = id_canevas
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

# Checklist CRUD
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
            detail="Impossible de creer la checklist a cause d'une contrainte d'integrite.",
        ) from exc
    return checklist

def update_checklist(db: Session, checklist_id: str, texte: Optional[str] = None, is_checked: Optional[bool] = None, id_section: Optional[str] = None, id_tache: Optional[str] = None) -> Optional[Checklist]:
    checklist = get_checklist_by_id(db, checklist_id)
    if checklist:
        if texte is not None:
            checklist.texte = texte
        if is_checked is not None:
            checklist.is_checked = is_checked
        if id_section is not None:
            checklist.id_section = id_section
        if id_tache is not None:
            checklist.id_tache = id_tache
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
