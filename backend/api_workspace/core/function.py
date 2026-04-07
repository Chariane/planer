import secrets
from datetime import datetime
from typing import Optional, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Espace, PlanerEntreprise, Utilisateur, Workspace

ModelType = TypeVar("ModelType")


def generate_unique_id(db: Session, model: Type[ModelType]) -> str:
    """
    Genere un ID hexadecimal unique de 12 caracteres pour un modele donne.
    Verifie l'unicite dans la table cible avant de le retourner.
    """
    while True:
        new_id = secrets.token_hex(6)
        result = db.execute(select(model).where(model.id == new_id))
        existing_obj = result.scalars().first()
        if not existing_obj:
            return new_id


def is_premium_user(user: Optional[Utilisateur]) -> bool:
    if not user:
        return False
    if user.type_compte != "Premium":
        return False
    return user.premium_expire_at is not None and user.premium_expire_at > datetime.utcnow()


def is_premium_entreprise(entreprise: Optional[PlanerEntreprise]) -> bool:
    if not entreprise:
        return False
    if not entreprise.is_premium or entreprise.statut_compte != "Actif":
        return False
    return entreprise.premium_expire_at is not None and entreprise.premium_expire_at > datetime.utcnow()


def user_has_premium_workspace_access(db: Session, user_id: str) -> bool:
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if is_premium_user(user):
        return True

    entreprise = db.query(PlanerEntreprise).filter(PlanerEntreprise.id_utilisateur == user_id).first()
    return is_premium_entreprise(entreprise)


def get_workspace_count_for_owner(db: Session, user_id: str) -> int:
    return db.query(Workspace).filter(Workspace.id_utilisateur == user_id).count()


def get_espace_count_for_owner(db: Session, user_id: str) -> int:
    return (
        db.query(Espace)
        .join(Workspace, Espace.id_workspace == Workspace.id)
        .filter(Workspace.id_utilisateur == user_id)
        .count()
    )


def can_create_workspace(db: Session, user_id: str) -> bool:
    if user_has_premium_workspace_access(db, user_id):
        return True
    return get_workspace_count_for_owner(db, user_id) < 1


def can_create_espace(db: Session, user_id: str) -> bool:
    if user_has_premium_workspace_access(db, user_id):
        return True
    return get_espace_count_for_owner(db, user_id) < 1
