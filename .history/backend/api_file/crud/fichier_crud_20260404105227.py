from sqlalchemy.orm import Session
from typing import List, Optional
from api_gateway.models import Fichier

def get_fichier_by_id(db: Session, fichier_id: str) -> Optional[Fichier]:
    return db.query(Fichier).filter(Fichier.id == fichier_id).first()

def get_fichiers_for_membre(db: Session, membre_id: str) -> List[Fichier]:
    return db.query(Fichier).filter(Fichier.id_membre == membre_id).all()

def create_fichier(db: Session, nom: str, url_fichier: str = None, type_fichier: str = None, meta_donnees: dict = None, id_membre: str = None) -> Fichier:
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

def update_fichier(db: Session, fichier_id: str, nom: str = None, url_fichier: str = None, type_fichier: str = None, meta_donnees: dict = None, id_membre: str = None) -> Optional[Fichier]:
    fichier = get_fichier_by_id(db, fichier_id)
    if fichier:
        if nom is not None:
            fichier.nom = nom
        if url_fichier is not None:
            fichier.url_fichier = url_fichier
        if type_fichier is not None:
            fichier.type_fichier = type_fichier
        if meta_donnees is not None:
            fichier.meta_donnees = meta_donnees
        if id_membre is not None:
            fichier.id_membre = id_membre
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