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
    create_workspace,
    delete_workspace,
    get_member,
    get_workspace_by_id,
    get_workspaces_for_user,
    invite_member_to_workspace,
    update_workspace,
)
from ..models import Utilisateur
from ..schemas import (
    EmailSchema,
    UtilisateurOut,
    WorkspaceCreate,
    WorkspaceInvitationAcceptRequest,
    WorkspaceMemberInvite,
    WorkspaceMemberOut,
    WorkspaceUpdate,
    WorkspaceWithContextOut,
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


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
        expires_delta=timedelta(days=7),
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
