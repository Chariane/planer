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
    WorkspaceInvitationResponse,
    WorkspaceMemberInvite,
    WorkspaceMemberOut,
    WorkspaceMemberUpdate,
    WorkspaceUpdate,
    WorkspaceWithContextOut,
)

router = APIRouter(prefix="/workspaces", tags=["Utilisateur Workspaces"])

# Créer un workspace, automatiquement associé à l'utilisateur connecté en tant que créateur et membre actif
@router.post("/create_workspace", response_model=WorkspaceWithContextOut, status_code=status.HTTP_201_CREATED)
def create_workspace_endpoint(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    workspace = create_workspace(db, workspace_in, current_user.id)
    membre = get_member(db, workspace.id, current_user.id)
    return _serialize_workspace(workspace, membre=membre, member_count=1)

@router.get("/all_resources", response_model=dict)
def get_all_user_resources_endpoint(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """
    Récupère une vue globale de toutes les ressources de l'utilisateur
    (Workspaces possédés, Workspaces rejoints, Espaces, Projets et Tâches).
    """
    from ..core.function import get_all_user_resources
    return get_all_user_resources(db, current_user.id)


#Modifier un workspace, uniquement si l'utilisateur est le créateur du workspace (propriétaire)
@router.put("/{workspace_id}/update_workspace", response_model=WorkspaceWithContextOut)
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

#Supprimer un workspace, uniquement si l'utilisateur est le créateur du workspace (propriétaire)
@router.delete("/{workspace_id}/delete_workspace", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_owner_access(db, workspace_id, current_user.id)
    if not delete_workspace(db, workspace_id):
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return None

#Inviter un membre dans un workspace, uniquement si l'utilisateur est administrateur du workspace
@router.post("/{workspace_id}/invite_member", response_model=WorkspaceInvitationResponse, status_code=status.HTTP_201_CREATED)
def invite_member_endpoint(
    workspace_id: str,
    membre_in: WorkspaceMemberInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Invite un utilisateur dans un workspace via email."""
    # 0. Permission check
    admin_member = _require_workspace_management_access(db, workspace_id, current_user.id)
    if admin_member and admin_member.role != "Administrateur":
        raise HTTPException(
            status_code=403,
            detail="Seuls les administrateurs du workspace peuvent envoyer des invitations.",
        )

    # 1. Verification existence workspace
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    # 2. Email target
    email_target = membre_in.email
    if not email_target and membre_in.username:
        user = db.query(Utilisateur).filter(func.lower(Utilisateur.username) == membre_in.username.lower()).first()
        if not user:
             raise HTTPException(status_code=404, detail="Utilisateur non trouve")
        email_target = user.email

    if not email_target:
        raise HTTPException(status_code=400, detail="Email ou username requis.")

    # 3. Delegation au CRUD
    result = invite_member_to_workspace(db, workspace_id, email_target, membre_in.role)
    
    if result["status"] == "existing_user":
        membre = result["membre"]
        token = result["token"]
        target_username = membre.utilisateur.username if membre.utilisateur else email_target
        
        background_tasks.add_task(
            send_workspace_invitation_email,
            current_user.username,
            target_username,
            EmailSchema(email=[email_target]),
            workspace.nom,
            membre_in.role,
            token,
            is_guest=False,
        )
        return {
            "status": "existing_user",
            "message": "Invitation envoyee a l'utilisateur existant.",
            "email": email_target,
            "membre": _serialize_member(membre)
        }
    else:
        # Cas guest_invitation
        token = result["token"]
        background_tasks.add_task(
            send_workspace_invitation_email,
            current_user.username,
            email_target, 
            EmailSchema(email=[email_target]),
            workspace.nom,
            membre_in.role,
            token,
            is_guest=True,
        )
        return {
            "status": "guest_invitation",
            "message": "Invitation envoyee par lien (utilisateur non inscrit).",
            "email": email_target,
            "token": token
        }


@router.post("/invitations/accept_workspace_invitation", response_model=WorkspaceMemberOut)
def accept_workspace_invitation_endpoint(
    invitation_in: WorkspaceInvitationAcceptRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Accepte une invitation a un workspace (JWT ou existant)."""
    # Toute la logique est maintenant centralisée dans le CRUD
    membre = accept_workspace_invitation(
        db, 
        workspace_id=None, # Sera extrait du token par le CRUD
        user_id=current_user.id, 
        invitation_token=invitation_in.token
    )
    return _serialize_member(membre)

# liste des membres d'un workspace, uniquement si l'utilisateur est membre actif ou créateur du workspace
@router.get("/{workspace_id}/list_workspace_members", response_model=list[WorkspaceMemberOut])
def list_workspace_members_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    _require_workspace_management_access(db, workspace_id, current_user.id)
    return get_members_of_workspace(db, workspace_id)

#Modifier le rôle ou le statut d'un membre du workspace, uniquement si l'utilisateur est administrateur du workspace (et interdit de modifier le rôle du créateur)
@router.put("/{workspace_id}/members/{user_id}/update_workspace_member", response_model=WorkspaceMemberOut)
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

#Supprimer ou retirer un membre d'un workspace, uniquement si l'utilisateur est administrateur du workspace (et interdit de supprimer le créateur)
@router.delete("/{workspace_id}/members/{user_id}/remove_workspace_member", status_code=status.HTTP_204_NO_CONTENT)
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

#Liste des invitations en attente reçues par l'utilisateur connecté, avec les détails du workspace et de l'expéditeur de l'invitation
@router.get("/invitations/list_pending_invitations", response_model=list[WorkspaceMemberOut])
def list_pending_invitations_endpoint(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste toutes les invitations en attente reçues par l'utilisateur connecté."""
    membres = get_pending_invitations(db, current_user.id)
    return [_serialize_member(m) for m in membres]

#Recuperer le détail d'un workspace avec le contexte de l'utilisateur connecté (rôle dans le workspace), uniquement si l'utilisateur est membre actif ou créateur du workspace
@router.get("/{workspace_id}/get_workspace_detail", response_model=WorkspaceWithContextOut)
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

#L'utilisateur connecté quitte un workspace, uniquement si il est membre actif du workspace et interdit au créateur de quitter son propre workspace
@router.post("/{workspace_id}/leave_workspace", status_code=status.HTTP_204_NO_CONTENT)
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

#Supprimer ou annuler une invitation en attente, uniquement si l'utilisateur est administrateur du workspace
@router.delete("/{workspace_id}/invitations/{user_id}/cancel_invitation", status_code=status.HTTP_204_NO_CONTENT)
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
