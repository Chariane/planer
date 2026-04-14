from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.function import (
    _require_workspace_admin_access,
    _require_workspace_owner_access,
    _serialize_member,
    _serialize_workspace,
)
from ..core.security import get_current_user
from ..crud.admin import (
    delete_admin_workspace,
    get_admin_workspace_members,
    get_my_admin_workspaces,
    remove_admin_workspace_member,
    update_admin_workspace_member,
)
from ..crud.utilisateur import get_member
from ..schemas import UtilisateurOut, WorkspaceMemberOut, WorkspaceMemberUpdate, WorkspaceWithContextOut

router = APIRouter(prefix="/admin/workspaces", tags=["Admin Workspaces"])


@router.get("", response_model=List[WorkspaceWithContextOut])
def list_my_admin_workspaces(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste les workspaces dont l'utilisateur courant est administrateur."""
    workspaces = get_my_admin_workspaces(db, current_user.id)
    return [
        _serialize_workspace(
            workspace,
            membre=get_member(db, workspace.id, current_user.id),
        )
        for workspace in workspaces
    ]


@router.get("/{workspace_id}", response_model=WorkspaceWithContextOut)
def get_admin_workspace_detail(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    workspace, membre = _require_workspace_admin_access(db, workspace_id, current_user.id)
    return _serialize_workspace(workspace, membre=membre)


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
def list_admin_workspace_members(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_admin_access(db, workspace_id, current_user.id)
    members = get_admin_workspace_members(db, workspace_id)
    if members is None:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return [_serialize_member(m) for m in members]


@router.put("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberOut)
def update_admin_member(
    workspace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_admin_access(db, workspace_id, current_user.id)
    target_member = get_member(db, workspace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=400, detail="Impossible de modifier le role du createur")

    updated_member = update_admin_workspace_member(db, workspace_id, user_id, membre_in)
    if not updated_member:
        raise HTTPException(status_code=404, detail="Erreur lors de la mise a jour")
    return _serialize_member(updated_member)


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_admin_member(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_admin_access(db, workspace_id, current_user.id)
    target_member = get_member(db, workspace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=403, detail="Le createur du workspace ne peut pas etre supprime")

    removed = remove_admin_workspace_member(db, workspace_id, user_id)
    if removed is None:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    if not removed:
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression du membre")
    return None


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_by_admin(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_owner_access(db, workspace_id, current_user.id)
    if not delete_admin_workspace(db, workspace_id):
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression du workspace")
    return None
