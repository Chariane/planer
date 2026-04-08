from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_admin
from ..crud.admin import (
    delete_admin_workspace,
    get_admin_workspace,
    get_admin_workspace_member,
    get_admin_workspace_members,
    get_admin_workspaces,
    remove_admin_workspace_member,
    update_admin_workspace_member,
)
from ..schemas import MembreOut, MembreUpdate, UtilisateurOut, WorkspaceOut

router = APIRouter(prefix="/admin/workspaces", tags=["Admin Workspaces"])


@router.get("", response_model=List[WorkspaceOut])
def list_admin_workspaces(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin),
):
    return get_admin_workspaces(db, skip=skip, limit=limit)


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_admin_workspace_detail(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin),
):
    workspace = get_admin_workspace(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return workspace


@router.get("/{workspace_id}/members", response_model=List[MembreOut])
def list_admin_workspace_members(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin),
):
    members = get_admin_workspace_members(db, workspace_id)
    if members is None:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return members


@router.put("/{workspace_id}/members/{user_id}", response_model=MembreOut)
def update_admin_member(
    workspace_id: str,
    user_id: str,
    membre_in: MembreUpdate,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin),
):
    target_member = get_admin_workspace_member(db, workspace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=400, detail="Impossible de modifier le role du createur")

    updated_member = update_admin_workspace_member(db, workspace_id, user_id, membre_in)
    if not updated_member:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return updated_member


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_admin_member(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin),
):
    target_member = get_admin_workspace_member(db, workspace_id, user_id)
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
    current_admin: UtilisateurOut = Depends(get_current_admin),
):
    workspace = get_admin_workspace(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    if not delete_admin_workspace(db, workspace_id):
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression du workspace")
    return None
