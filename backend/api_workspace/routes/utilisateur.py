# backend/api_workspace/routes/utilisateur.py

from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..core.emails import send_workspace_invitation_email
from ..core.database import get_db
from ..core.function import (
    _require_workspace_read_access,
    _require_workspace_invitation_access,
    _require_workspace_management_access,
    _require_workspace_member_management_access,
    _require_workspace_owner_access,
    _serialize_member,
    _serialize_workspace,
    get_user_navigation_data,
    get_user_workspaces_listing,
    get_workspace_local_resources,
    render_invitation_html_page
)
from ..core.security import get_current_user, decode_invitation_token, config_data
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
    remove_member_from_workspace,
    get_workspace_member
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


@router.post("/{workspace_id}/invite_member_workspace", response_model=WorkspaceInvitationResponse, status_code=status.HTTP_201_CREATED)
def invite_workspace_member(
    workspace_id: str,
    membre_in: WorkspaceMemberInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Invite un utilisateur dans un workspace via email et token (existant ou guest)."""
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    email_target = membre_in.email or membre_in.username
    _require_workspace_invitation_access(
        db,
        workspace_id,
        current_user.id,
        membre_in.role,
    )

    # Delegation de la logique d'invitation au CRUD
    result = invite_member_to_workspace(
        db,
        workspace_id,
        membre_in,
    )

    if "membre" in result:
        # Cas utilisateur existant
        membre = result["membre"]
        token = result["invitation_token"]
        recipient_email = (
            membre.utilisateur.email
            if (membre.utilisateur and membre.utilisateur.email)
            else email_target
        )
        target_name = (
            membre.utilisateur.username
            if (membre.utilisateur and membre.utilisateur.username)
            else recipient_email
        )
        
        background_tasks.add_task(
            send_workspace_invitation_email,
            current_user.username,
            target_name,
            recipient_email,
            workspace.nom,
            membre_in.role,
            token,
            is_guest=False
        )
        return {
            "status": "existing_user",
            "message": "Invitation envoyee a l'utilisateur existant.",
            "email": recipient_email,
            "membre": _serialize_member(membre)
        }
    else:
        # Cas invitation externe (Guest)
        token = result["token"]
        background_tasks.add_task(
            send_workspace_invitation_email,
            current_user.username,
            email_target,
            email_target,
            workspace.nom,
            membre_in.role,
            token,
            is_guest=True
        )
        return {
            "status": "guest_invitation",
            "message": "Invitation envoyee par lien (utilisateur non inscrit).",
            "email": email_target,
            "token": token
        }

#Accepter une invitation à un espace via token (endpoint authentifié — gardé pour compatibilité)
@router.post("/invitations/accept", response_model=WorkspaceMemberOut)
def accept_workspace_invitation_endpoint(
    invitation_in: WorkspaceInvitationAcceptRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Accepte une invitation a un workspace (classique ou JWT guest)."""
    # On délègue toute la logique de validation et de creation au CRUD
    membre = accept_workspace_invitation(
        db, 
        workspace_id=None, # Sera extrait du token par le CRUD
        user_id=current_user.id,
        invitation_token=invitation_in.token
    )
    return _serialize_member(membre)

# ─── Acceptation directe depuis l'email (pas d'authentification requise) ───
@router.get("/invitations/accept-from-email")
def accept_workspace_invitation_from_email(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Accepte une invitation a un espace directement depuis le lien email.
    Pas d'authentification requise — le token JWT contient le sub de l'utilisateur.
    Retourne une page HTML avec le resultat.
    """

    front_base_url = str(config_data.get("FRONT_BASE_URL", "http://localhost:5173")).strip("'").strip('"').strip()
    accepted_redirect_url = f"{front_base_url}/invitation/accept?token={token}&status=success&type=workspace"
    already_member_redirect_url = f"{front_base_url}/invitation/accept?token={token}&status=already_member&type=workspace"

    # 1. Décodage du token
    payload = decode_invitation_token(token)
    if not payload:
        return render_invitation_html_page(
            title="Lien invalide",
            icon="❌",
            message="Ce lien d'invitation est invalide ou a expiré.",
            sub_message="Demandez à l'administrateur de vous renvoyer une nouvelle invitation.",
            color="#dc3545"
        )

    # 2. Extraire le user_id du token (sub)
    user_id = payload.get("sub")
    if not user_id:
        return render_invitation_html_page(
            title="Lien non compatible",
            icon="⚠️",
            message="Ce lien est destiné à un nouvel utilisateur. Veuillez vous inscrire sur la plateforme pour accepter l'invitation.",
            color="#f0ad4e"
        )

    # 3. Vérifier si déjà acceptée (optimisation avant d'appeler le CRUD)
    target_workspace_id = payload.get("workspace_id")
    if target_workspace_id:
        existing = get_workspace_member(db, target_workspace_id, user_id)
        if existing and existing.statut == "Actif":
            return RedirectResponse(url=already_member_redirect_url, status_code=302)

    # 4. Accepter l'invitation via le CRUD existant
    try:
        membre = accept_workspace_invitation(
            db,
            workspace_id=None,
            user_id=user_id,
            invitation_token=token
        )
        return RedirectResponse(url=accepted_redirect_url, status_code=302)
    except HTTPException as e:
        if e.status_code == 409:
            return RedirectResponse(url=already_member_redirect_url, status_code=302)
        return render_invitation_html_page(
            title="Erreur",
            icon="❌",
            message=e.detail or "Une erreur est survenue lors de l'acceptation.",
            color="#dc3545"
        )



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
    if user_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Vous ne pouvez pas vous retirer via la gestion des membres.",
        )
    _require_workspace_owner_access(db, workspace_id, current_user.id)

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
