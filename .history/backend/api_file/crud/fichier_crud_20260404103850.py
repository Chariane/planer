from sqlalchemy.orm import Session
from typing import List, Optional
from api_gateway.models import Fichier

def get_fichier_by_id(db: Session, fichier_id: str) -> Optional[Fichier]:
    return db.query(Fichier).filter(Fichier.id == fichier_id).first()

def get_fichiers_for_membre(db: Session, membre_id: str) -> List[Fichier]:
    return db.query(Fichier).filter(Fichier.id_membre == membre_id).all()

def create_fichier(db: Session, nom_fichier: str, chemin_fichier: str, type_fichier: str = None, taille_fichier: int = None, id_membre: str = None) -> Fichier:
    fichier = Fichier(
        nom_fichier=nom_fichier,
        chemin_fichier=chemin_fichier,
        type_fichier=type_fichier,
        taille_fichier=taille_fichier,
        id_membre=id_membre
    )
    db.add(fichier)
    db.commit()
    db.refresh(fichier)
    return fichier

def update_fichier(db: Session, fichier_id: str, nom_fichier: str = None, chemin_fichier: str = None, type_fichier: str = None, taille_fichier: int = None, id_membre: str = None) -> Fichier:
    fichier = get_fichier_by_id(db, fichier_id)
    if fichier:
        if nom_fichier is not None:
            fichier.nom_fichier = nom_fichier
        if chemin_fichier is not None:
            fichier.chemin_fichier = chemin_fichier
        if type_fichier is not None:
            fichier.type_fichier = type_fichier
        if taille_fichier is not None:
            fichier.taille_fichier = taille_fichier
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