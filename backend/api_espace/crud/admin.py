from typing import List, Optional
from sqlalchemy.orm import Session
from .utilisateur import (
    delete_espace,
    get_espace_by_id,
    get_espace_member,
    get_espace_members,
    get_espaces_where_admin,
    remove_espace_member,
    update_espace_member,
)
from ..models import Espace, Membre
from ..schemas import WorkspaceMemberUpdate


def get_my_admin_espaces(db: Session, user_id: str) -> List[Espace]:
    """Retourne les espaces où l'utilisateur est administrateur (Créateur ou Administrateur)."""
    return get_espaces_where_admin(db, user_id)


def get_admin_espace(db: Session, espace_id: str) -> Optional[Espace]:
    return get_espace_by_id(db, espace_id)


def get_admin_espace_members(db: Session, espace_id: str) -> Optional[List[Membre]]:
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return None
    return get_espace_members(db, espace_id)


def update_admin_espace_member(
    db: Session,
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
) -> Optional[Membre]:
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return None
    return update_espace_member(db, espace_id, user_id, membre_in)


def remove_admin_espace_member(db: Session, espace_id: str, user_id: str) -> Optional[bool]:
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return None
    return remove_espace_member(db, espace_id, user_id)


def delete_admin_espace(db: Session, espace_id: str) -> bool:
    return delete_espace(db, espace_id)


def get_admin_espace_member(db: Session, espace_id: str, user_id: str) -> Optional[Membre]:
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        return None
    return get_espace_member(db, espace_id, user_id)
