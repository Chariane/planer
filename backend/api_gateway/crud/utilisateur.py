from typing import Optional, List
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..models import Utilisateur
from ..core.function import generate_unique_user_id



def create_utilisateur(db: Session, user_data: dict) -> Utilisateur:
    """Crée un utilisateur en base de données."""
    user_data.setdefault("id", generate_unique_user_id(db))
    new_user = Utilisateur(**user_data)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def get_utilisateur_by_id(db: Session, user_id: str) -> Optional[Utilisateur]:
    return db.query(Utilisateur).filter(Utilisateur.id == user_id).first()

def get_utilisateur_by_email(db: Session, email: str) -> Optional[Utilisateur]:
    normalized_email = email.strip().lower()
    return db.query(Utilisateur).filter(func.lower(Utilisateur.email) == normalized_email).first()

def get_utilisateur_by_username(db: Session, username: str) -> Optional[Utilisateur]:
    normalized_username = username.strip().lower()
    return db.query(Utilisateur).filter(func.lower(Utilisateur.username) == normalized_username).first()

def get_utilisateur_by_email_or_username(db: Session, email: str, username: str) -> Optional[Utilisateur]:
    """Retourne l'utilisateur si l'email ou le nom d'utilisateur existe."""
    normalized_email = email.strip().lower()
    normalized_username = username.strip().lower()
    return db.query(Utilisateur).filter(
        or_(
            func.lower(Utilisateur.email) == normalized_email,
            func.lower(Utilisateur.username) == normalized_username,
        )
    ).first()

def get_utilisateur_by_verification_token(db: Session, token: str) -> Optional[Utilisateur]:
    return db.query(Utilisateur).filter(Utilisateur.token_confirmation_email == token).first()

def get_all_utilisateurs(db: Session, skip: int = 0, limit: int = 100) -> List[Utilisateur]:
    return db.query(Utilisateur).offset(skip).limit(limit).all()

def update_utilisateur(db: Session, user_id: str, update_data: dict) -> Optional[Utilisateur]:
    user = get_utilisateur_by_id(db, user_id)
    if user:
        for key, value in update_data.items():
            setattr(user, key, value)
        db.commit()
        db.refresh(user)
    return user

def delete_utilisateur(db: Session, user_id: str) -> bool:
    user = get_utilisateur_by_id(db, user_id)
    if user:
        user.statut = "Supprimé"
        user.is_active = False
        db.commit()
        return True
    return False
