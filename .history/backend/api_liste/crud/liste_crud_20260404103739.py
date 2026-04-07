from sqlalchemy.orm import Session
from typing import List, Optional
from api_gateway.models import Liste, Tache, Canevas, Section, Checklist

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
    db.commit()
    db.refresh(liste)
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

def create_tache(db: Session, titre: str, description: str = None, date_debut: str = None, date_fin_prevue: str = None, date_fin_reelle: str = None, statut: str = "A faire", priorite: str = "Moyenne", progression: int = 0, commentaires: str = None, id_liste: str = None) -> Tache:
    tache = Tache(
        titre=titre, description=description, date_debut=date_debut, date_fin_prevue=date_fin_prevue,
        date_fin_reelle=date_fin_reelle, statut=statut, priorite=priorite, progression=progression,
        commentaires=commentaires, id_liste=id_liste
    )
    db.add(tache)
    db.commit()
    db.refresh(tache)
    return tache

def update_tache(db: Session, tache_id: str, **kwargs) -> Tache:
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

def create_canevas(db: Session, nom: str, description: str = None, id_liste: str = None) -> Canevas:
    canevas = Canevas(nom=nom, description=description, id_liste=id_liste)
    db.add(canevas)
    db.commit()
    db.refresh(canevas)
    return canevas

def update_canevas(db: Session, canevas_id: str, nom: str = None, description: str = None, id_liste: str = None) -> Canevas:
    canevas = get_canevas_by_id(db, canevas_id)
    if canevas:
        if nom is not None:
            canevas.nom = nom
        if description is not None:
            canevas.description = description
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

def create_section(db: Session, titre: str, description: str = None, ordre: int = 1, id_canevas: str = None) -> Section:
    section = Section(titre=titre, description=description, ordre=ordre, id_canevas=id_canevas)
    db.add(section)
    db.commit()
    db.refresh(section)
    return section

def update_section(db: Session, section_id: str, titre: str = None, description: str = None, ordre: int = None, id_canevas: str = None) -> Section:
    section = get_section_by_id(db, section_id)
    if section:
        if titre is not None:
            section.titre = titre
        if description is not None:
            section.description = description
        if ordre is not None:
            section.ordre = ordre
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

def create_checklist(db: Session, titre: str, description: str = None, is_checked: bool = False, ordre: int = 1, id_section: str = None, id_tache: str = None) -> Checklist:
    checklist = Checklist(titre=titre, description=description, is_checked=is_checked, ordre=ordre, id_section=id_section, id_tache=id_tache)
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist

def update_checklist(db: Session, checklist_id: str, titre: str = None, description: str = None, is_checked: bool = None, ordre: int = None, id_section: str = None, id_tache: str = None) -> Checklist:
    checklist = get_checklist_by_id(db, checklist_id)
    if checklist:
        if titre is not None:
            checklist.titre = titre
        if description is not None:
            checklist.description = description
        if is_checked is not None:
            checklist.is_checked = is_checked
        if ordre is not None:
            checklist.ordre = ordre
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