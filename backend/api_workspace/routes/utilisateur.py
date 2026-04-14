from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..core.emails import send_workspace_invitation_email
from ..core.database import get_db
from ..core.function import (
    _require_workspace_management_access,
    _require_workspace_owner_access,
    _serialize_member,
    _serialize_workspace,
)
from ..core.security import ALGORITHM, SECRET_KEY, create_access_token, get_current_user
from ..crud.utilisateur import (
    accept_workspace_invitation,
    cancel_workspace_invitation,
    create_workspace,
    delete_workspace,
    get_member,
    get_members_of_workspace,
    get_pending_invitations,
    get_workspace_by_id,
    get_workspace_detail,
    get_workspaces_for_user,
    invite_member_to_workspace,
    leave_workspace,
    update_member_role,
    update_workspace,
    remove_member_from_workspace,
)
from ..models import Utilisateur
from ..schemas import (
    EmailSchema,
    UtilisateurOut,
    WorkspaceCreate,
    WorkspaceInvitationAcceptRequest,
    WorkspaceMemberInvite,
    WorkspaceMemberOut,
    WorkspaceMemberUpdate,
    WorkspaceUpdate,
    WorkspaceWithContextOut,
)

router = APIRouter(prefix="/workspaces", tags=["Utilisateur Workspaces"])


@router.post("", response_model=WorkspaceWithContextOut, status_code=status.HTTP_201_CREATED)
def create_workspace_endpoint(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    workspace = create_workspace(db, workspace_in, current_user.id)
    membre = get_member(db, workspace.id, current_user.id)
    return _serialize_workspace(workspace, membre=membre, member_count=1)


@router.get("", response_model=list[WorkspaceWithContextOut])
def list_my_and_joined_workspaces_endpoint(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    workspaces = get_workspaces_for_user(db, current_user.id)
    return [
        _serialize_workspace(
            workspace,
            membre=get_member(db, workspace.id, current_user.id),
        )
        for workspace in workspaces
    ]


@router.put("/{workspace_id}", response_model=WorkspaceWithContextOut)
def update_workspace_endpoint(
    workspace_id: str,
    workspace_in: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _, membre = _require_workspace_owner_access(db, workspace_id, current_user.id)
    workspace = update_workspace(db, workspace_id, workspace_in)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return _serialize_workspace(workspace, membre=membre)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_owner_access(db, workspace_id, current_user.id)
    if not delete_workspace(db, workspace_id):
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return None


@router.post("/{workspace_id}/invite", response_model=WorkspaceMemberOut, status_code=status.HTTP_201_CREATED)
def invite_member_endpoint(
    workspace_id: str,
    membre_in: WorkspaceMemberInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    admin_member = _require_workspace_management_access(db, workspace_id, current_user.id)
    if admin_member and admin_member.role != "Administrateur":
        raise HTTPException(
            status_code=403,
            detail="Seuls les administrateurs du workspace peuvent envoyer des invitations.",
        )

    target_user = None
    if membre_in.email:
        target_user = (
            db.query(Utilisateur)
            .filter(func.lower(Utilisateur.email) == membre_in.email.lower())
            .first()
        )
    elif membre_in.username:
        target_user = (
            db.query(Utilisateur)
            .filter(func.lower(Utilisateur.username) == membre_in.username.lower())
            .first()
        )

    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur invite non trouve")

    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    existing_member = get_member(db, workspace_id, target_user.id)
    if existing_member and existing_member.statut == "Actif":
        raise HTTPException(status_code=400, detail="L'utilisateur est deja membre actif de ce workspace")

    membre = invite_member_to_workspace(db, workspace_id, target_user.id, membre_in.role)
    invitation_token = create_access_token(
        {
            "sub": target_user.id,
            "workspace_id": workspace_id,
            "scope": "workspace_invitation_accept",
        },
        expires_delta=timedelta(days=4),
    )
    background_tasks.add_task(
        send_workspace_invitation_email,
        current_user.username,
        target_user.username,
        EmailSchema(email=[target_user.email]),
        workspace.nom,
        membre_in.role,
        invitation_token,
    )
    return _serialize_member(membre)


@router.post("/invitations/accept", response_model=WorkspaceMemberOut)
def accept_workspace_invitation_endpoint(
    invitation_in: WorkspaceInvitationAcceptRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    try:
        payload = jwt.decode(invitation_in.token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=400, detail="Invitation invalide ou expiree") from exc

    if payload.get("scope") != "workspace_invitation_accept":
        raise HTTPException(status_code=400, detail="Token d'invitation invalide")

    invited_user_id = payload.get("sub")
    workspace_id = payload.get("workspace_id")
    if not invited_user_id or not workspace_id:
        raise HTTPException(status_code=400, detail="Token d'invitation invalide")

    if invited_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cette invitation ne vous est pas destinee")

    membre = accept_workspace_invitation(db, workspace_id, current_user.id)
    if not membre:
        raise HTTPException(status_code=400, detail="Invitation introuvable ou deja traitee")
    return _serialize_member(membre)


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberOut])
def list_workspace_members_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_management_access(db, workspace_id, current_user.id)
    return get_members_of_workspace(db, workspace_id)


@router.put("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberOut)
def update_workspace_member_endpoint(
    workspace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_management_access(db, workspace_id, current_user.id)
    target_member = get_member(db, workspace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    
    if target_member.role == "Créateur":
        raise HTTPException(status_code=400, detail="Impossible de modifier le role du créateur")

    updated = update_member_role(db, workspace_id, user_id, membre_in)
    if not updated:
        raise HTTPException(status_code=400, detail="Erreur lors de la mise à jour")
    return _serialize_member(updated)


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_workspace_member_endpoint(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_management_access(db, workspace_id, current_user.id)
    target_member = get_member(db, workspace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    
    if target_member.role == "Créateur":
        raise HTTPException(status_code=403, detail="Impossible de supprimer le créateur du workspace")

    success = remove_member_from_workspace(db, workspace_id, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression")
    return None


@router.get("/invitations/pending", response_model=list[WorkspaceMemberOut])
def list_pending_invitations_endpoint(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste toutes les invitations en attente reçues par l'utilisateur connecté."""
    membres = get_pending_invitations(db, current_user.id)
    return [_serialize_member(m) for m in membres]


@router.get("/{workspace_id}", response_model=WorkspaceWithContextOut)
def get_workspace_detail_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Récupère le détail d'un workspace (accessible si membre actif ou propriétaire)."""
    workspace = get_workspace_detail(db, workspace_id, current_user.id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve ou acces refuse")
    membre = get_member(db, workspace_id, current_user.id)
    return _serialize_workspace(workspace, membre=membre)


@router.post("/{workspace_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """L'utilisateur connecté quitte le workspace (interdit au créateur)."""
    result = leave_workspace(db, workspace_id, current_user.id)
    if result is False:
        workspace = get_workspace_by_id(db, workspace_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace non trouve")
        if workspace.id_utilisateur == current_user.id:
            raise HTTPException(status_code=403, detail="Le createur ne peut pas quitter son workspace")
        raise HTTPException(status_code=404, detail="Vous n'etes pas membre actif de ce workspace")
    return None


@router.delete("/{workspace_id}/invitations/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_invitation_endpoint(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """L'administrateur annule une invitation en attente."""
    _require_workspace_management_access(db, workspace_id, current_user.id)
    result = cancel_workspace_invitation(db, workspace_id, user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Invitation introuvable")
    if result is False:
        raise HTTPException(status_code=400, detail="Cette invitation n'est pas en attente")
    return None
