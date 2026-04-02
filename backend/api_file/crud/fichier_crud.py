from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Fichier, Membre

def get_fichier_by_id(db: Session, fichier_id: str) -> Optional[Fichier]:
    return db.query(Fichier).filter(Fichier.id == fichier_id).first()

def get_fichiers_by_membre(db: Session, membre_id: str) -> List[Fichier]:
    return db.query(Fichier).filter(Fichier.id_membre == membre_id).all()

def get_fichiers_by_utilisateur(db: Session, user_id: str) -> List[Fichier]:
    # Récupère tous les fichiers des membres dont l'utilisateur est le titulaire
    membres_ids = db.query(Membre.id).filter(Membre.id_utilisateur == user_id).subquery()
    return db.query(Fichier).filter(Fichier.id_membre.in_(membres_ids)).all()

def get_fichiers_by_workspace(db: Session, workspace_id: str) -> List[Fichier]:
    # Récupère les membres du workspace, puis leurs fichiers
    membres_ids = db.query(Membre.id).filter(Membre.id_workspace == workspace_id).subquery()
    return db.query(Fichier).filter(Fichier.id_membre.in_(membres_ids)).all()

def get_fichiers_by_espace(db: Session, espace_id: str) -> List[Fichier]:
    # Récupère les membres de l'espace, puis leurs fichiers
    membres_ids = db.query(Membre.id).filter(Membre.id_espace == espace_id).subquery()
    return db.query(Fichier).filter(Fichier.id_membre.in_(membres_ids)).all()

def get_fichiers_by_liste(db: Session, liste_id: str) -> List[Fichier]:
    # Récupère les membres de la liste, puis leurs fichiers
    membres_ids = db.query(Membre.id).filter(Membre.id_liste == liste_id).subquery()
    return db.query(Fichier).filter(Fichier.id_membre.in_(membres_ids)).all()

def create_fichier(db: Session, nom: str, url_fichier: str, type_fichier: str,
                   meta_donnees: dict, id_membre: str) -> Fichier:
    fichier = Fichier(
        nom=nom,
        url_fichier=url_fichier,
        type_fichier=type_fichier,
        meta_donnees=meta_donnees,
        id_membre=id_membre
    )
    db.add(fichier)
    db.commit()
    db.refresh(fichier)
    return fichier

def update_fichier(db: Session, fichier_id: str, **kwargs) -> Optional[Fichier]:
    fichier = get_fichier_by_id(db, fichier_id)
    if fichier:
        for key, value in kwargs.items():
            if value is not None:
                setattr(fichier, key, value)
        db.commit()
        db.refresh(fichier)
    return fichier

def delete_fichier(db: Session, fichier_id: str) -> bool:
    fichier = get_fichier_by_id(db, fichier_id)
    if fichier:
        db.delete(fichier)
        db.commit()
        return True
    return False