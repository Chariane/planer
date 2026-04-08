from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_active_entreprise
from ..crud.entreprise import (
    get_entreprise_workspace,
    get_entreprise_workspace_members,
    get_entreprise_workspaces,
    get_member_for_entreprise_workspace,
    invite_member_for_entreprise_workspace,
    remove_member_for_entreprise_workspace,
    update_member_for_entreprise_workspace,
)
from ..models import Utilisateur
from ..schemas import MembreCreate, MembreOut, MembreUpdate, UtilisateurOut, WorkspaceMemberInvite, WorkspaceOut

router = APIRouter(prefix="/entreprise/workspaces", tags=["Entreprise Workspaces"])


@router.get("", response_model=List[WorkspaceOut])
def list_entreprise_workspaces(
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    return get_entreprise_workspaces(db, current_entreprise.id)


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_entreprise_workspace_detail(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    workspace = get_entreprise_workspace(db, current_entreprise.id, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return workspace


@router.get("/{workspace_id}/members", response_model=List[MembreOut])
def list_entreprise_workspace_members(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    members = get_entreprise_workspace_members(db, current_entreprise.id, workspace_id)
    if members is None:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return members


@router.post("/{workspace_id}/members", response_model=MembreOut, status_code=status.HTTP_201_CREATED)
def invite_member_entreprise_workspace(
    workspace_id: str,
    membre_in: WorkspaceMemberInvite,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    workspace = get_entreprise_workspace(db, current_entreprise.id, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    target_user = db.query(Utilisateur).filter(Utilisateur.email == membre_in.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur invite non trouve")

    if get_member_for_entreprise_workspace(db, current_entreprise.id, workspace_id, target_user.id):
        raise HTTPException(status_code=400, detail="L'utilisateur est deja membre")

    membership_payload = MembreCreate(
        id_utilisateur=target_user.id,
        id_workspace=workspace_id,
        role=membre_in.role,
        statut="Actif",
    )

    return invite_member_for_entreprise_workspace(db, current_entreprise.id, workspace_id, membership_payload)


@router.put("/{workspace_id}/members/{user_id}", response_model=MembreOut)
def update_member_entreprise_workspace(
    workspace_id: str,
    user_id: str,
    membre_in: MembreUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    target_member = get_member_for_entreprise_workspace(db, current_entreprise.id, workspace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=400, detail="Impossible de modifier le role du createur")

    updated_member = update_member_for_entreprise_workspace(
        db,
        current_entreprise.id,
        workspace_id,
        user_id,
        membre_in,
    )
    if not updated_member:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return updated_member


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_entreprise_workspace(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    target_member = get_member_for_entreprise_workspace(db, current_entreprise.id, workspace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=403, detail="Le createur du workspace ne peut pas etre supprime")

    removed = remove_member_for_entreprise_workspace(db, current_entreprise.id, workspace_id, user_id)
    if removed is None:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    if not removed:
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression du membre")
    return None
