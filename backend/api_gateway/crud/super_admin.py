from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from ..crud.entreprise import set_user_entreprise_flag
from ..models import PlanerEntreprise, Utilisateur


def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[Utilisateur]:
    return db.query(Utilisateur).offset(skip).limit(limit).all()


def get_user_by_id(db: Session, user_id: str) -> Optional[Utilisateur]:
    return db.query(Utilisateur).filter(Utilisateur.id == user_id).first()


def update_user_roles(db: Session, user: Utilisateur, update_data: dict) -> Utilisateur:
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


def get_all_entreprises(db: Session, skip: int = 0, limit: int = 100) -> List[PlanerEntreprise]:
    return db.query(PlanerEntreprise).offset(skip).limit(limit).all()


def get_entreprise_by_id(db: Session, entreprise_id: str) -> Optional[PlanerEntreprise]:
    return db.query(PlanerEntreprise).filter(PlanerEntreprise.id == entreprise_id).first()


def update_entreprise(db: Session, entreprise: PlanerEntreprise, update_data: dict) -> PlanerEntreprise:
    for key, value in update_data.items():
        setattr(entreprise, key, value)

    if entreprise.id_utilisateur:
        set_user_entreprise_flag(db, entreprise.id_utilisateur, True)

    entreprise.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entreprise)
    return entreprise


def delete_entreprise(db: Session, entreprise: PlanerEntreprise) -> None:
    if entreprise.id_utilisateur:
        set_user_entreprise_flag(db, entreprise.id_utilisateur, False)

    db.delete(entreprise)
    db.commit()
