from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.function import can_create_workspace
from ..schemas import (
    MembreCreate,
    WorkspaceCreate,
    WorkspaceMemberInvite,
    WorkspaceMemberOut,
    WorkspaceMemberUpdate,
    WorkspaceUpdate,
    WorkspaceWithContextOut,
    UtilisateurOut,
)
from ..core.security import get_current_user
from ..crud.ustilisateur import (
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

WORKSPACE_MANAGEMENT_ROLES = {"Créateur", "Administrateur"}


def _serialize_workspace(workspace, membre=None, member_count=None):
    effective_member = membre
    if effective_member is None:
        effective_member = next(
            (
                workspace_member
                for workspace_member in workspace.membres
                if workspace_member.id_utilisateur == workspace.id_utilisateur
            ),
            None,
        )

    resolved_member_count = member_count if member_count is not None else len(workspace.membres or [])

    return {
        "id": workspace.id,
        "nom": workspace.nom,
        "description": workspace.description,
        "created_at": workspace.created_at,
        "updated_at": workspace.updated_at,
        "id_utilisateur": workspace.id_utilisateur,
        "member_count": resolved_member_count,
        "current_user_role": effective_member.role if effective_member else None,
        "current_user_statut": effective_member.statut if effective_member else None,
    }


def _serialize_member(membre):
    utilisateur = membre.utilisateur
    return {
        "id": membre.id,
        "created_at": membre.created_at,
        "role": membre.role,
        "statut": membre.statut,
        "id_utilisateur": membre.id_utilisateur,
        "id_workspace": membre.id_workspace,
        "id_espace": membre.id_espace,
        "id_liste": membre.id_liste,
        "id_tache": membre.id_tache,
        "utilisateur": (
            {
                "id": utilisateur.id,
                "username": utilisateur.username,
                "email": utilisateur.email,
                "nom": utilisateur.nom,
                "prenoms": utilisateur.prenoms,
            }
            if utilisateur
            else None
        ),
    }


def _get_member_or_403(db: Session, workspace_id: str, current_user_id: str):
    membre = get_member(db, workspace_id, current_user_id)
    if not membre:
        raise HTTPException(status_code=403, detail="Acces refuse")
    return membre


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    membre = _get_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants")
    return membre


@router.post("", response_model=WorkspaceWithContextOut, status_code=status.HTTP_201_CREATED)
def create_workspace_endpoint(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not can_create_workspace(db, current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Compte non premium: vous avez droit a un seul workspace et un seul espace.",
        )
    new_workspace = create_workspace(db, workspace_in, current_user.id)
    membre = get_member(db, new_workspace.id, current_user.id)
    return _serialize_workspace(new_workspace, membre=membre, member_count=1)


@router.get("", response_model=List[WorkspaceWithContextOut])
def get_workspaces_endpoint(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    workspaces = get_workspaces_for_user(db, current_user.id)
    return [
        _serialize_workspace(
            workspace,
            membre=get_member(db, workspace.id, current_user.id),
        )
        for workspace in workspaces
    ]


@router.get("/{workspace_id}", response_model=WorkspaceWithContextOut)
def get_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    membre = _get_member_or_403(db, workspace_id, current_user.id)
    return _serialize_workspace(workspace, membre=membre)


@router.put("/{workspace_id}", response_model=WorkspaceWithContextOut)
def update_workspace_endpoint(
    workspace_id: str,
    workspace_in: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = _require_workspace_management_access(db, workspace_id, current_user.id)
    workspace = update_workspace(db, workspace_id, workspace_in)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return _serialize_workspace(workspace, membre=membre)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = _get_member_or_403(db, workspace_id, current_user.id)
    if membre.role != "Créateur":
        raise HTTPException(status_code=403, detail="Seul le createur peut supprimer le workspace")
    if not delete_workspace(db, workspace_id):
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return None


@router.post("/{workspace_id}/invite", response_model=WorkspaceMemberOut)
def invite_member_endpoint(
    workspace_id: str,
    membre_in: WorkspaceMemberInvite,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    _require_workspace_management_access(db, workspace_id, current_user.id)
    from ..models import Utilisateur
    target_user = db.query(Utilisateur).filter(Utilisateur.email == membre_in.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur invite non trouve")
    if get_member(db, workspace_id, target_user.id):
        raise HTTPException(status_code=400, detail="L'utilisateur est deja membre")
    membership_payload = MembreCreate(
        id_utilisateur=target_user.id,
        id_workspace=workspace_id,
        role=membre_in.role,
        statut="Actif",
    )
    new_membre = add_member_to_workspace(
        db,
        workspace_id,
        membership_payload,
    )
    return _serialize_member(new_membre)


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberOut])
def get_members_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _get_member_or_403(db, workspace_id, current_user.id)
    members = get_members_of_workspace(db, workspace_id)
    return [_serialize_member(member) for member in members]


@router.put("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberOut)
def update_member_endpoint(
    workspace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_workspace_management_access(db, workspace_id, current_user.id)
    target_membre = get_member(db, workspace_id, user_id)
    if not target_membre:
        raise HTTPException(status_code=404, detail="Membre cible non trouve")
    if target_membre.role == "Créateur":
        raise HTTPException(status_code=400, detail="Impossible de modifier le role du createur")
    updated = update_member_role(db, workspace_id, user_id, membre_in)
    return _serialize_member(updated)


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_endpoint(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    _require_workspace_management_access(db, workspace_id, current_user.id)
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous retirer vous-meme")
    target_membre = get_member(db, workspace_id, user_id)
    if not target_membre:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_membre.role == "Créateur":
        raise HTTPException(status_code=403, detail="Le createur du workspace ne peut pas etre supprime")
    if not remove_member_from_workspace(db, workspace_id, user_id):
        raise HTTPException(status_code=404, detail="Erreur lors de la suppression")
    return None


@router.get("/{workspace_id}/my-role", response_model=dict)
def get_my_role_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    membre = _get_member_or_403(db, workspace_id, current_user.id)
    return {"role": membre.role, "statut": membre.statut}
