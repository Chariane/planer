from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from ..crud.entreprise import set_user_entreprise_flag
from ..core.function import commit_or_raise
from ..models import PlanerEntreprise, Utilisateur

ROLE_FLAG_FIELDS = {
    "is_admin",
    "is_super_admin",
    "is_livreur",
    "is_entreprise",
    "is_user",
}


def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[Utilisateur]:
    return db.query(Utilisateur).offset(skip).limit(limit).all()


def get_user_by_id(db: Session, user_id: str) -> Optional[Utilisateur]:
    return db.query(Utilisateur).filter(Utilisateur.id == user_id).first()


def create_user_with_roles(db: Session, user_data: dict) -> Utilisateur:
    user = Utilisateur(**user_data)
    db.add(user)
    commit_or_raise(
        db,
        detail="Impossible de creer l'utilisateur a cause d'une contrainte d'integrite.",
        refresh_instance=user,
    )
    return user


def update_user_role_flags(db: Session, user: Utilisateur, update_data: dict) -> Utilisateur:
    allowed_updates = {
        key: value
        for key, value in update_data.items()
        if key in ROLE_FLAG_FIELDS
    }

    if not allowed_updates:
        return user

    for key, value in allowed_updates.items():
        setattr(user, key, value)

    commit_or_raise(
        db,
        detail="Impossible de mettre a jour les indicateurs de roles utilisateur a cause d'une contrainte d'integrite.",
        refresh_instance=user,
    )
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
    commit_or_raise(
        db,
        detail="Impossible de mettre a jour l'entreprise a cause d'une contrainte d'integrite.",
        refresh_instance=entreprise,
    )
    return entreprise


def delete_entreprise(db: Session, entreprise: PlanerEntreprise) -> None:
    if entreprise.id_utilisateur:
        set_user_entreprise_flag(db, entreprise.id_utilisateur, False)

    db.delete(entreprise)
    commit_or_raise(
        db,
        detail="Impossible de supprimer l'entreprise a cause d'une contrainte d'integrite.",
    )
