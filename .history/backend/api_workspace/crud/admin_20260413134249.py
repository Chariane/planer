from typing import List, Optional

from sqlalchemy.orm import Session

from .utilisateur import (
    delete_workspace,
    get_all_workspaces,
    get_member,
    get_members_of_workspace,
    get_workspace_by_id,
    remove_member_from_workspace,
    update_member_role,
)
from ..models import Membre, Workspace
from ..schemas import MembreUpdate


def get_admin_workspaces(db: Session, skip: int = 0, limit: int = 100) -> List[Workspace]:
    return get_all_workspaces(db, skip=skip, limit=limit)


def get_admin_workspace(db: Session, workspace_id: str) -> Optional[Workspace]:
    return get_workspace_by_id(db, workspace_id)


def get_admin_workspace_members(db: Session, workspace_id: str) -> Optional[List[Membre]]:
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return None
    return get_members_of_workspace(db, workspace_id)


def update_admin_workspace_member(
    db: Session,
    workspace_id: str,
    user_id: str,
    membre_in: MembreUpdate,
) -> Optional[Membre]:
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return None
    return update_member_role(db, workspace_id, user_id, membre_in)


def remove_admin_workspace_member(db: Session, workspace_id: str, user_id: str) -> Optional[bool]:
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return None
    return remove_member_from_workspace(db, workspace_id, user_id)


def delete_admin_workspace(db: Session, workspace_id: str) -> bool:
    return delete_workspace(db, workspace_id)


def get_admin_workspace_member(db: Session, workspace_id: str, user_id: str) -> Optional[Membre]:
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return None
    return get_member(db, workspace_id, user_id)
