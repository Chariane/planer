import secrets
from datetime import datetime, timedelta
from typing import Any, Type, TypeVar
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


def generate_email_verification_token() -> str:
    return secrets.token_urlsafe(32)


def get_email_verification_expiration(hours: int = 24) -> datetime:
    return datetime.utcnow() + timedelta(hours=hours)


def build_email_verification_metadata(hours: int = 24) -> dict[str, Any]:
    return {
        "is_utilisateur_verifie": False,
        "email_verified_at": None,
        "token_confirmation_email": generate_email_verification_token(),
        "date_exp_token_confirmation_email": get_email_verification_expiration(hours=hours),
    }
