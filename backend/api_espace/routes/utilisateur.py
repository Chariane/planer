from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.function import can_create_espace
from ..core.security import get_current_user
from ..crud.utilisateur import (
    add_member_to_espace,
    create_espace,
    delete_espace,
    get_espace_by_id,
    get_espace_member,
    get_espace_members,
    get_espaces_for_workspace,
    remove_espace_member,
    update_espace,
    update_espace_member,
)
from ..models import Membre, Utilisateur, Workspace
from ..schemas import (
    EspaceCreate,
    EspaceOut,
    EspaceUpdate,
    MembreCreate,
    MembreOut,
    UtilisateurOut,
    WorkspaceMemberInvite,
    WorkspaceMemberUpdate,
)

router = APIRouter(tags=["Espaces"])

WORKSPACE_MANAGEMENT_ROLES = {"Créateur", "Administrateur"}
ESPACE_MANAGEMENT_ROLES = {"Créateur", "Administrateur"}


def _get_workspace_or_404(db: Session, workspace_id: str) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return workspace


def _get_workspace_member_or_403(db: Session, workspace_id: str, current_user_id: str) -> Membre:
    membre = (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif",
        )
        .first()
    )
    if not membre:
        raise HTTPException(status_code=403, detail="Acces refuse au workspace")
    return membre


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str) -> Membre:
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants sur le workspace")
    return membre


def _get_espace_or_404(db: Session, espace_id: str) -> EspaceOut:
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return espace


def _require_espace_access(db: Session, espace_id: str, workspace_id: str, current_user_id: str):
    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member:
        return espace_member
    return _get_workspace_member_or_403(db, workspace_id, current_user_id)


def _require_espace_management_access(db: Session, espace_id: str, workspace_id: str, current_user_id: str):
    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member and espace_member.role in ESPACE_MANAGEMENT_ROLES:
        return espace_member
    return _require_workspace_management_access(db, workspace_id, current_user_id)


@router.post("/workspaces/{workspace_id}/espaces", response_model=EspaceOut, status_code=status.HTTP_201_CREATED)
def create_espace_endpoint(
    workspace_id: str,
    espace_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    workspace = _get_workspace_or_404(db, workspace_id)
    _require_workspace_management_access(db, workspace_id, current_user.id)

    if workspace.id_utilisateur and not can_create_espace(db, workspace.id_utilisateur):
        raise HTTPException(
            status_code=403,
            detail="Compte non premium: vous avez droit a un seul workspace et un seul espace.",
        )

    if espace_in.id_espace_parent:
        parent_espace = get_espace_by_id(db, espace_in.id_espace_parent)
        if not parent_espace:
            raise HTTPException(status_code=404, detail="Espace parent non trouve")
        if parent_espace.id_workspace != workspace_id:
            raise HTTPException(status_code=400, detail="L'espace parent doit appartenir au meme workspace")

    espace_payload = espace_in.model_copy(update={"id_workspace": workspace_id})
    return create_espace(db, espace_payload, current_user.id)


@router.get("/workspaces/{workspace_id}/espaces", response_model=List[EspaceOut])
def list_workspaces_espaces(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _get_workspace_or_404(db, workspace_id)
    _get_workspace_member_or_403(db, workspace_id, current_user.id)
    return get_espaces_for_workspace(db, workspace_id)


@router.get("/espaces/{espace_id}", response_model=EspaceOut)
def get_espace_endpoint(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = _get_espace_or_404(db, espace_id)
    _require_espace_access(db, espace_id, espace.id_workspace, current_user.id)
    return espace


@router.put("/espaces/{espace_id}", response_model=EspaceOut)
def update_espace_endpoint(
    espace_id: str,
    espace_in: EspaceUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = _get_espace_or_404(db, espace_id)
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)

    if espace_in.id_workspace and espace_in.id_workspace != espace.id_workspace:
        raise HTTPException(status_code=400, detail="Le workspace d'un espace ne peut pas etre modifie")

    if espace_in.id_espace_parent:
        parent_espace = get_espace_by_id(db, espace_in.id_espace_parent)
        if not parent_espace:
            raise HTTPException(status_code=404, detail="Espace parent non trouve")
        if parent_espace.id_workspace != espace.id_workspace:
            raise HTTPException(status_code=400, detail="L'espace parent doit appartenir au meme workspace")
        if parent_espace.id == espace.id:
            raise HTTPException(status_code=400, detail="Un espace ne peut pas etre son propre parent")

    updated = update_espace(db, espace_id, espace_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return updated


@router.delete("/espaces/{espace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_espace_endpoint(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = _get_espace_or_404(db, espace_id)
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)
    if not delete_espace(db, espace_id):
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression de l'espace")
    return None


@router.get("/espaces/{espace_id}/members", response_model=List[MembreOut])
def list_espace_members(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = _get_espace_or_404(db, espace_id)
    _require_espace_access(db, espace_id, espace.id_workspace, current_user.id)
    return get_espace_members(db, espace_id)


@router.post("/espaces/{espace_id}/members", response_model=MembreOut, status_code=status.HTTP_201_CREATED)
def invite_espace_member(
    espace_id: str,
    membre_in: WorkspaceMemberInvite,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = _get_espace_or_404(db, espace_id)
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)

    target_user = db.query(Utilisateur).filter(Utilisateur.email == membre_in.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur invite non trouve")

    if get_espace_member(db, espace_id, target_user.id):
        raise HTTPException(status_code=400, detail="L'utilisateur est deja membre de cet espace")

    membre_payload = MembreCreate(
        id_utilisateur=target_user.id,
        id_espace=espace_id,
        role=membre_in.role,
        statut="Actif",
    )
    return add_member_to_espace(db, espace_id, membre_payload)


@router.put("/espaces/{espace_id}/members/{user_id}", response_model=MembreOut)
def update_espace_member_endpoint(
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = _get_espace_or_404(db, espace_id)
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)

    target_member = get_espace_member(db, espace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=400, detail="Impossible de modifier le role du createur")

    updated = update_espace_member(db, espace_id, user_id, membre_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    return updated


@router.delete("/espaces/{espace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_espace_member_endpoint(
    espace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = _get_espace_or_404(db, espace_id)
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)

    target_member = get_espace_member(db, espace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=403, detail="Le createur de l'espace ne peut pas etre supprime")

    if not remove_espace_member(db, espace_id, user_id):
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression du membre")
    return None
