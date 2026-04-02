from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Liste, Workspace, Espace, Membre  # Ajout de Membre

def get_liste_by_id(db: Session, liste_id: str) -> Optional[Liste]:
    return db.query(Liste).filter(Liste.id == liste_id).first()

def get_listes_by_workspace(db: Session, workspace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_workspace == workspace_id).all()

def get_listes_by_espace(db: Session, espace_id: str) -> List[Liste]:
    return db.query(Liste).filter(Liste.id_espace == espace_id).all()

def create_liste(db: Session, nom: str, description: str, workspace_id: str = None, espace_id: str = None) -> Liste:
    liste = Liste(
        nom=nom,
        description=description,
        id_workspace=workspace_id,
        id_espace=espace_id
    )
    db.add(liste)
    db.commit()
    db.refresh(liste)
    return liste

def update_liste(db: Session, liste_id: str, nom: str = None, description: str = None) -> Liste:
    liste = get_liste_by_id(db, liste_id)
    if liste:
        if nom is not None:
            liste.nom = nom
        if description is not None:
            liste.description = description
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

def get_listes_accessibles_par_utilisateur(db: Session, user_id: str) -> List[Liste]:
    # Récupérer les workspaces où l'utilisateur est membre
    workspaces_ids = db.query(Membre.id_workspace).filter(
        Membre.id_utilisateur == user_id,
        Membre.id_workspace.isnot(None)
    ).subquery()
    # Récupérer les espaces où l'utilisateur est membre
    espaces_ids = db.query(Membre.id_espace).filter(
        Membre.id_utilisateur == user_id,
        Membre.id_espace.isnot(None)
    ).subquery()
    # Listes liées aux workspaces ou espaces accessibles
    listes = db.query(Liste).filter(
        (Liste.id_workspace.in_(workspaces_ids)) |
        (Liste.id_espace.in_(espaces_ids))
    ).all()
    return listes