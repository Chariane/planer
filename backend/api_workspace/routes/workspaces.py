from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from api_gateway.models import Utilisateur
from ..database import get_db
from ..schemas import (
    WorkspaceCreate, WorkspaceOut, WorkspaceUpdate,
    MembreCreate, MembreOut, MembreUpdate, UtilisateurOut
)
from ..security import get_current_user
from ..crud.workspace_crud import (
    get_workspace_by_id,
    get_workspaces_for_user,
    create_workspace,
    update_workspace,
    delete_workspace,
    get_member,
    get_members_of_workspace,
    add_member_to_workspace,
    update_member_role,
    remove_member_from_workspace
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace_endpoint(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_workspace = create_workspace(db, workspace_in.nom, workspace_in.description, current_user.id)
    return new_workspace


@router.get("", response_model=List[WorkspaceOut])
def get_workspaces_endpoint(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    workspaces = get_workspaces_for_user(db, current_user.id)
    return workspaces


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not get_member(db, workspace_id, current_user.id):
        raise HTTPException(status_code=403, detail="Accès refusé")
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    return workspace


@router.put("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace_endpoint(
    workspace_id: str,
    workspace_in: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = get_member(db, workspace_id, current_user.id)
    if not membre or membre.role not in ["Propriétaire", "Admin"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants")
    workspace = update_workspace(db, workspace_id, workspace_in.nom, workspace_in.description)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = get_member(db, workspace_id, current_user.id)
    if not membre or membre.role != "Propriétaire":
        raise HTTPException(status_code=403, detail="Seul le propriétaire peut supprimer le workspace")
    if not delete_workspace(db, workspace_id):
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    return None


@router.post("/{workspace_id}/invite", response_model=MembreOut)
def invite_member_endpoint(
    workspace_id: str,
    membre_in: MembreCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    current_membre = get_member(db, workspace_id, current_user.id)
    if not current_membre or current_membre.role not in ["Propriétaire", "Admin"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants pour inviter")
    # Vérifier que l'utilisateur invité existe
    from api_gateway.models import Utilisateur
    target_user = db.query(Utilisateur).filter(Utilisateur.id == membre_in.id_utilisateur).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur invité non trouvé")
    if get_member(db, workspace_id, membre_in.id_utilisateur):
        raise HTTPException(status_code=400, detail="L'utilisateur est déjà membre")
    new_membre = add_member_to_workspace(db, workspace_id, membre_in.id_utilisateur, membre_in.role, membre_in.statut)
    return new_membre


@router.get("/{workspace_id}/members", response_model=List[MembreOut])
def get_members_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not get_member(db, workspace_id, current_user.id):
        raise HTTPException(status_code=403, detail="Accès refusé")
    members = get_members_of_workspace(db, workspace_id)
    return members


@router.put("/{workspace_id}/members/{user_id}", response_model=MembreOut)
def update_member_endpoint(
    workspace_id: str,
    user_id: str,
    membre_in: MembreUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    current_membre = get_member(db, workspace_id, current_user.id)
    if not current_membre or current_membre.role not in ["Propriétaire", "Admin"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants")
    target_membre = get_member(db, workspace_id, user_id)
    if not target_membre:
        raise HTTPException(status_code=404, detail="Membre ciblé non trouvé")
    if target_membre.role == "Propriétaire":
        raise HTTPException(status_code=400, detail="Impossible de modifier le rôle du Propriétaire")
    updated = update_member_role(db, workspace_id, user_id, membre_in.role, membre_in.statut)
    return updated


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_endpoint(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    current_membre = get_member(db, workspace_id, current_user.id)
    if not current_membre or current_membre.role not in ["Propriétaire", "Admin"]:
        raise HTTPException(status_code=403, detail="Privilèges insuffisants")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous retirer vous‑même")
    target_membre = get_member(db, workspace_id, user_id)
    if not target_membre:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    if target_membre.role == "Propriétaire":
        raise HTTPException(status_code=403, detail="Le propriétaire du workspace ne peut pas être supprimé")
    if not remove_member_from_workspace(db, workspace_id, user_id):
        raise HTTPException(status_code=404, detail="Erreur lors de la suppression")
    return None


@router.get("/{workspace_id}/my-role", response_model=dict)
def get_my_role_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = get_member(db, workspace_id, current_user.id)
    if not membre:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas membre de ce workspace")
    return {"role": membre.role, "statut": membre.statut}