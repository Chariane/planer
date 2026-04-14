from typing import List, Optional
from sqlalchemy.orm import Session
from .utilisateur import (
    accept_workspace_invitation,
    create_workspace,
    delete_workspace,
    get_member,
    get_members_of_workspace,
    get_workspace_by_id,
    get_workspaces_for_user,
    invite_member_to_workspace,
    update_workspace,
    update_member_role,
    remove_member_from_workspace,
)
from ..models import Membre, Workspace
from ..schemas import WorkspaceCreate, WorkspaceUpdate, WorkspaceMemberUpdate


def get_entreprise_workspace(db: Session, entreprise_user_id: str, workspace_id: str) -> Optional[Workspace]:
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        return None

    if workspace.id_utilisateur == entreprise_user_id:
        return workspace

    membre = get_member(db, workspace_id, entreprise_user_id, active_only=True)
    if not membre:
        return None

    return workspace


def get_entreprise_workspaces(db: Session, entreprise_user_id: str) -> List[Workspace]:
    return get_workspaces_for_user(db, entreprise_user_id)


def create_entreprise_workspace(
    db: Session,
    workspace_in: WorkspaceCreate,
    entreprise_user_id: str,
) -> Workspace:
    return create_workspace(db, workspace_in, entreprise_user_id)


def update_entreprise_workspace(
    db: Session,
    workspace_id: str,
    workspace_in: WorkspaceUpdate,
) -> Optional[Workspace]:
    return update_workspace(db, workspace_id, workspace_in)


def delete_entreprise_workspace(db: Session, workspace_id: str) -> bool:
    return delete_workspace(db, workspace_id)


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
    workspace_id: str,
    user_id: str,
    role: str,
) -> Membre:
    return invite_member_to_workspace(db, workspace_id, user_id, role)


def accept_entreprise_workspace_invitation(
    db: Session,
    workspace_id: str,
    user_id: str,
) -> Optional[Membre]:
    return accept_workspace_invitation(db, workspace_id, user_id)


def update_entreprise_workspace_member(
    db: Session,
    entreprise_user_id: str,
    workspace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
) -> Optional[Membre]:
    workspace = get_entreprise_workspace(db, entreprise_user_id, workspace_id)
    if not workspace:
        return None
    return update_member_role(db, workspace_id, user_id, membre_in)


def remove_entreprise_workspace_member(
    db: Session,
    entreprise_user_id: str,
    workspace_id: str,
    user_id: str,
) -> Optional[bool]:
    workspace = get_entreprise_workspace(db, entreprise_user_id, workspace_id)
    if not workspace:
        return None
    return remove_member_from_workspace(db, workspace_id, user_id)

