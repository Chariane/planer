from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Rapport
from datetime import datetime

def get_rapport_by_id(db: Session, rapport_id: str) -> Optional[Rapport]:
    return db.query(Rapport).filter(Rapport.id == rapport_id).first()

def get_rapports_by_membre(db: Session, membre_id: str) -> List[Rapport]:
    return db.query(Rapport).filter(Rapport.id_membre == membre_id).all()

def get_rapports_by_liste_via_membre(db: Session, liste_id: str) -> List[Rapport]:
    """Récupère les rapports des membres de la liste (jointure)."""
    from api_gateway.models import Membre
    return db.query(Rapport).join(Membre, Rapport.id_membre == Membre.id).filter(Membre.id_liste == liste_id).all()

def create_rapport(db: Session, membre_id: str, titre: str, realisations: str, 
                   difficultes_et_solutions: str, commentaire: str, 
                   periode_debut: datetime, periode_fin: datetime,
                   fichier_joint: Optional[str] = None) -> Rapport:
    rapport = Rapport(
        id_membre=membre_id,
        titre=titre,
        realisations=realisations,
        difficultes_et_solutions=difficultes_et_solutions,
        commentaire=commentaire,
        periode_debut=periode_debut,
        periode_fin=periode_fin,
        fichier_joint=fichier_joint
    )
    db.add(rapport)
    db.commit()
    db.refresh(rapport)
    return rapport

def update_rapport(db: Session, rapport_id: str, **kwargs) -> Rapport:
    rapport = get_rapport_by_id(db, rapport_id)
    if rapport:
        for key, value in kwargs.items():
            if value is not None:
                setattr(rapport, key, value)
        db.commit()
        db.refresh(rapport)
    return rapport

def delete_rapport(db: Session, rapport_id: str) -> bool:
    rapport = get_rapport_by_id(db, rapport_id)
    if rapport:
        db.delete(rapport)
        db.commit()
        return True
    return False