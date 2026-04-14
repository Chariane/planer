from typing import List, Optional
from sqlalchemy.orm import Session
from utilisateur import (
    add_member_to_workspace,
    get_member,
    get_members_of_workspace,
    get_owned_workspaces,
    get_workspace_by_id,
    remove_member_from_workspace,
    update_member_role,
)
from models import Membre, Workspace
from schemas import MembreUpdate, WorkspaceMemberInvite


def get_entreprise_workspaces(db: Session, entreprise_user_id: str) -> List[Workspace]:
    return get_owned_workspaces(db, entreprise_user_id)


def get_entreprise_workspace(db: Session, entreprise_user_id: str, workspace_id: str) -> Optional[Workspace]:
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace or workspace.id_utilisateur != entreprise_user_id:
        return None
    return workspace


def get_entreprise_workspace_members(
    db: Session,
    entreprise_user_id: str,
    workspace_id: str,
) -> Optional[List[Membre]]:
    workspace = get_entreprise_workspace(db, entreprise_user_id, workspace_id)
    if not workspace:
        return None
    return get_members_of_workspace(db, workspace_id)


def invite_member_for_entreprise_workspace(
    db: Session,
    entreprise_user_id: str,
    workspace_id: str,
    membre_in: WorkspaceMemberInvite,
) -> Optional[Membre]:
    workspace = get_entreprise_workspace(db, entreprise_user_id, workspace_id)
    if not workspace:
        return None
    return add_member_to_workspace(db, workspace_id, membre_in)


def update_member_for_entreprise_workspace(
    db: Session,
    entreprise_user_id: str,
    workspace_id: str,
    user_id: str,
    membre_in: MembreUpdate,
) -> Optional[Membre]:
    workspace = get_entreprise_workspace(db, entreprise_user_id, workspace_id)
    if not workspace:
        return None
    return update_member_role(db, workspace_id, user_id, membre_in)


def remove_member_for_entreprise_workspace(
    db: Session,
    entreprise_user_id: str,
    workspace_id: str,
    user_id: str,
) -> Optional[bool]:
    workspace = get_entreprise_workspace(db, entreprise_user_id, workspace_id)
    if not workspace:
        return None
    return remove_member_from_workspace(db, workspace_id, user_id)


def get_member_for_entreprise_workspace(
    db: Session,
    entreprise_user_id: str,
    workspace_id: str,
    user_id: str,
) -> Optional[Membre]:
    workspace = get_entreprise_workspace(db, entreprise_user_id, workspace_id)
    if not workspace:
        return None
    return get_member(db, workspace_id, user_id)
