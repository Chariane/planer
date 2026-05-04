# backend/api_workspace/routes/utilisateur.py

from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..core.emails import send_workspace_invitation_email
from ..core.database import get_db
from ..core.function import (
    _require_workspace_read_access,
    _require_workspace_invitation_access,
    _require_workspace_member_management_access,
    _require_workspace_owner_access,
    _serialize_member,
    _serialize_workspace,
    get_user_navigation_data,
    get_user_workspaces_listing,
    get_workspace_local_resources,
)
from ..core.security import get_current_user
from ..crud.utilisateur import (
    accept_workspace_invitation,
    cancel_workspace_invitation,
    create_workspace,
    delete_workspace,
    get_member,
    get_members_of_workspace,
    get_pending_invitations,
    get_workspace_by_id,
    invite_member_to_workspace,
    leave_workspace,
    update_member_role,
    update_workspace,
    remove_member_from_workspace
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
    WorkspaceWithContextOut
)

router = APIRouter(prefix="/workspaces", tags=["Utilisateur Workspaces"])


# ============================================================================
# CRÉATION ET GESTION DE WORKSPACES
# ============================================================================

@router.post("/create_workspace", response_model=WorkspaceWithContextOut, status_code=status.HTTP_201_CREATED)
def create_workspace_endpoint(
    workspace_in: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Crée un workspace, l'utilisateur devient automatiquement créateur et membre actif."""
    workspace = create_workspace(db, workspace_in, current_user.id)
    membre = get_member(db, workspace.id, current_user.id)
    return _serialize_workspace(workspace, membre=membre, member_count=1)


@router.put("/{workspace_id}/update_workspace", response_model=WorkspaceWithContextOut)
def update_workspace_endpoint(
    workspace_id: str,
    workspace_in: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Modifie un workspace (réservé au créateur)."""
    _, membre, _ = _require_workspace_owner_access(db, workspace_id, current_user.id)
    workspace = update_workspace(db, workspace_id, workspace_in)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    return _serialize_workspace(workspace, membre=membre)


@router.delete("/{workspace_id}/delete_workspace", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Supprime un workspace (réservé au créateur)."""
    _require_workspace_owner_access(db, workspace_id, current_user.id)
    if not delete_workspace(db, workspace_id):
        raise HTTPException(status_code=404, detail="Workspace non trouvé")
    return None


@router.get("/{workspace_id}/get_workspace_detail", response_model=WorkspaceWithContextOut)
def get_workspace_detail_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Récupère le détail d'un workspace avec contexte utilisateur."""
    workspace, membre, _ = _require_workspace_read_access(db, workspace_id, current_user.id)
    return _serialize_workspace(workspace, membre=membre)


# ============================================================================
# NAVIGATION ET LISTING
# ============================================================================

@router.get("/my_navigation", response_model=dict)
def get_my_navigation_endpoint(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Vue GLOBALE : Toutes les ressources de navigation de l'utilisateur."""
    return get_user_navigation_data(db, current_user.id)


@router.get("/my_access", response_model=dict)
def get_my_workspace_access_endpoint(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Listing des workspaces : Possédés vs Rejoints."""
    return get_user_workspaces_listing(db, current_user.id)


@router.get("/{workspace_id}/local_resources", response_model=dict)
def get_workspace_local_resources_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Vue contextualisée : Ressources internes d'un workspace précis."""
    return get_workspace_local_resources(db, workspace_id, current_user.id)


# ============================================================================
# GESTION DES MEMBRES
# ============================================================================

@router.get("/{workspace_id}/list_workspace_members", response_model=List[WorkspaceMemberOut])
def list_workspace_members_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste tous les membres d'un workspace."""
    _require_workspace_read_access(db, workspace_id, current_user.id)
    members = get_members_of_workspace(db, workspace_id)
    return [_serialize_member(m) for m in members]


@router.post("/{workspace_id}/invite_member", response_model=WorkspaceInvitationResponse, status_code=status.HTTP_201_CREATED)
def invite_member_endpoint(
    workspace_id: str,
    membre_in: WorkspaceMemberInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Invite un utilisateur dans un workspace via email."""
    _require_workspace_invitation_access(
        db,
        workspace_id,
        current_user.id,
        membre_in.role,
    )

    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouvé")

    # Déterminer l'email cible
    email_target = membre_in.email
    if not email_target and membre_in.username:
        user = db.query(Utilisateur).filter(func.lower(Utilisateur.username) == membre_in.username.lower()).first()
        if not user:
             raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        email_target = user.email

    if not email_target:
        raise HTTPException(status_code=400, detail="Email ou username requis.")

    # Délégation au CRUD
    result = invite_member_to_workspace(
        db,
        workspace_id,
        email_target,
        membre_in.role,
        id_liste=membre_in.id_liste,
        id_tache=membre_in.id_tache,
    )
    
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
            "message": "Invitation envoyée à l'utilisateur existant.",
            "email": email_target,
            "membre": _serialize_member(membre)
        }
    else:
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
            "message": "Invitation envoyée par lien (utilisateur non inscrit).",
            "email": email_target,
            "token": token
        }


@router.post("/invitations/accept_workspace_invitation", response_model=WorkspaceMemberOut)
def accept_workspace_invitation_endpoint(
    invitation_in: WorkspaceInvitationAcceptRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Accepte une invitation à un workspace (JWT)."""
    membre = accept_workspace_invitation(
        db, 
        workspace_id=None,
        user_id=current_user.id, 
        invitation_token=invitation_in.token
    )
    return _serialize_member(membre)


@router.get("/invitations/list_pending_invitations", response_model=List[WorkspaceMemberOut])
def list_pending_invitations_endpoint(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste toutes les invitations en attente reçues par l'utilisateur."""
    membres = get_pending_invitations(db, current_user.id)
    return [_serialize_member(m) for m in membres]


@router.delete("/{workspace_id}/invitations/{user_id}/cancel_invitation", status_code=status.HTTP_204_NO_CONTENT)
def cancel_invitation_endpoint(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """L'administrateur annule une invitation en attente."""
    _require_workspace_member_management_access(
        db,
        workspace_id,
        current_user.id,
        user_id,
    )
    result = cancel_workspace_invitation(db, workspace_id, user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Invitation introuvable")
    if result is False:
        raise HTTPException(status_code=400, detail="Cette invitation n'est pas en attente")
    return None


@router.put("/{workspace_id}/members/{user_id}/update_workspace_member", response_model=WorkspaceMemberOut)
def update_workspace_member_endpoint(
    workspace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Modifie le rôle ou le statut d'un membre."""
    _require_workspace_member_management_access(
        db,
        workspace_id,
        current_user.id,
        user_id,
        membre_in.role
    )

    updated = update_member_role(db, workspace_id, user_id, membre_in)
    if not updated:
        raise HTTPException(status_code=400, detail="Erreur lors de la mise à jour")
    return _serialize_member(updated)


@router.delete("/{workspace_id}/members/{user_id}/remove_workspace_member", status_code=status.HTTP_204_NO_CONTENT)
def remove_workspace_member_endpoint(
    workspace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Supprime ou retire un membre d'un workspace."""
    _require_workspace_member_management_access(
        db,
        workspace_id,
        current_user.id,
        user_id,
    )

    success = remove_member_from_workspace(db, workspace_id, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression")
    return None


# ============================================================================
# ACTIONS UTILISATEUR
# ============================================================================

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
            raise HTTPException(status_code=404, detail="Workspace non trouvé")
        if workspace.id_utilisateur == current_user.id:
            raise HTTPException(status_code=403, detail="Le créateur ne peut pas quitter son workspace")
        raise HTTPException(status_code=404, detail="Vous n'êtes pas membre actif de ce workspace")
    return None