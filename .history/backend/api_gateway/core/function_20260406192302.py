import secrets
from typing import Type, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Utilisateur

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


def generate_unique_user_id(db: Session) -> str:
    """
    Conserve l'API demandee pour la table utilisateur.
    """
    return generate_unique_id(db, Utilisateur)
