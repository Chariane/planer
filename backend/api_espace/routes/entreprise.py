from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.function import (
    _get_workspace_or_404,
    _require_espace_access,
    _require_espace_visibility_access,
    _require_espace_invitation_access,
    _require_espace_management_access,
    _require_espace_member_management_access,
    _require_workspace_management_access,
    _require_workspace_descendant_read_access,
    _serialize_member,
    can_create_espace,
)
from ..core.security import get_current_user, get_current_active_entreprise
from ..core.emails import send_espace_invitation_email
from ..crud.entreprise import (
    create_entreprise_espace,
    delete_entreprise_espace,
    get_entreprise_espace,
    get_entreprise_espace_members,
    get_entreprise_espaces,
    remove_entreprise_espace_member,
    update_entreprise_espace,
    update_entreprise_espace_member,
)
from ..crud.utilisateur import (
    get_espace_by_id,
    get_espace_member,
    get_root_espaces_for_workspace,
    get_sub_espaces_for_parent,
    get_workspace_espaces_tree,
    invite_member_to_espace,
    accept_espace_invitation,
)
from ..models import Utilisateur
from ..schemas import (
    EspaceCreate,
    EspaceOut,
    EspaceTreeOut,
    EspaceUpdate,
    EspaceMemberOut,
    EspaceInvitationAcceptRequest,
    MembreCreate,
    UtilisateurOut,
    WorkspaceMemberInvite,
    WorkspaceMemberUpdate,
)

router = APIRouter(tags=["Entreprise Espaces"])

#creer un espace dans un workspace entreprise, uniquement si l'utilisateur est admin du workspace
@router.post(
    "/entreprise/workspaces/{workspace_id}/espaces",
    response_model=EspaceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_entreprise_espace_endpoint(
    workspace_id: str,
    espace_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    """Créer un espace rattaché à un workspace (compte entreprise)."""
    workspace = _get_workspace_or_404(db, workspace_id)
    _require_workspace_management_access(db, workspace_id, current_entreprise.id)

    espace_payload = espace_in.model_copy(update={"id_workspace": workspace_id, "id_espace_parent": None})
    return create_entreprise_espace(db, espace_payload, current_entreprise.id)

#creer un sous-espace dans un espace entreprise, uniquement si l'utilisateur est admin de l'espace parent
@router.post(
    "/entreprise/espaces/{espace_id}/sous-espaces",
    response_model=EspaceOut,
    status_code=status.HTTP_201_CREATED,
)
def create_entreprise_sous_espace_endpoint(
    espace_id: str,
    espace_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    """Créer un sous-espace rattaché à un espace parent (compte entreprise)."""
    parent_espace = get_espace_by_id(db, espace_id)
    if not parent_espace:
        raise HTTPException(status_code=404, detail="Espace parent non trouve")

    _require_espace_management_access(db, espace_id, parent_espace.id_workspace, current_entreprise.id)

    espace_payload = espace_in.model_copy(update={
        "id_espace_parent": espace_id,
        "id_workspace": parent_espace.id_workspace,
    })
    return create_entreprise_espace(db, espace_payload, current_entreprise.id)

# Récupérer l'arborescence complète des espaces d'un workspace entreprise
@router.get("/entreprise/workspaces/{workspace_id}/espaces", response_model=List[EspaceOut])
def list_entreprise_espaces_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    """Liste à plat de TOUS les espaces du workspace (entreprise)."""
    _get_workspace_or_404(db, workspace_id)
    _require_workspace_descendant_read_access(db, workspace_id, current_entreprise.id)
    return get_entreprise_espaces(db, current_entreprise.id, workspace_id)

# Récupérer uniquement les espaces de niveau 1 d'un workspace entreprise
@router.get("/entreprise/workspaces/{workspace_id}/espaces/roots", response_model=List[EspaceOut])
def list_entreprise_workspace_root_espaces(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    """Liste uniquement les espaces de niveau 1 d'un workspace (entreprise)."""
    _get_workspace_or_404(db, workspace_id)
    _require_workspace_descendant_read_access(db, workspace_id, current_entreprise.id)
    return get_root_espaces_for_workspace(db, workspace_id)

# Récupérer les sous-espaces directs d'un espace entreprise
@router.get("/entreprise/espaces/{espace_id}/children", response_model=List[EspaceOut])
def list_entreprise_espace_children(
    espace_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    """Liste les sous-espaces directs d'un espace parent (entreprise)."""
    espace = get_entreprise_espace(db, current_entreprise.id, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve ou acces refuse")
    _require_espace_visibility_access(db, espace_id, espace.id_workspace, current_entreprise.id)
    return get_sub_espaces_for_parent(db, espace_id)

# Récupérer les détails d'un espace entreprise dans un workspace, uniquement si l'utilisateur est membre de l'espace
@router.get("/entreprise/workspaces/{workspace_id}/espaces/tree", response_model=List[EspaceTreeOut])
def get_entreprise_workspace_espaces_tree(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    """Récupère l'arborescence complète du workspace (entreprise)."""
    _get_workspace_or_404(db, workspace_id)
    _require_workspace_descendant_read_access(db, workspace_id, current_entreprise.id)
    return get_workspace_espaces_tree(db, workspace_id, current_entreprise.id)

# Récupérer les détails d'un espace entreprise dans un workspace, uniquement si l'utilisateur est membre de l'espace
@router.get("/entreprise/espaces/{espace_id}", response_model=EspaceOut)
def get_entreprise_espace_detail_endpoint(
    espace_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    espace = get_entreprise_espace(db, current_entreprise.id, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve ou acces refuse")
    return espace

# Modifier un espace entreprise, uniquement si l'utilisateur est admin de l'espace
@router.put("/entreprise/espaces/{espace_id}", response_model=EspaceOut)
def update_entreprise_espace_endpoint(
    espace_id: str,
    espace_in: EspaceUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    espace = get_entreprise_espace(db, current_entreprise.id, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve ou acces refuse")
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_entreprise.id)

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

    updated = update_entreprise_espace(db, espace_id, espace_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return updated

#Supprimer un espace entreprise (et ses sous-espaces), uniquement si l'utilisateur est admin de l'espace
@router.delete("/entreprise/espaces/{espace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entreprise_espace_endpoint(
    espace_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    espace = get_entreprise_espace(db, current_entreprise.id, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve ou acces refuse")
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_entreprise.id)
    if not delete_entreprise_espace(db, espace_id):
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression de l'espace")
    return None

# Liste les membres d'un espace entreprise
@router.get("/entreprise/espaces/{espace_id}/members", response_model=List[EspaceMemberOut])
def list_entreprise_espace_members_endpoint(
    espace_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    members = get_entreprise_espace_members(db, current_entreprise.id, espace_id)
    if members is None:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_entreprise.id)
    return [_serialize_member(m) for m in members]

# Inviter un membre dans un espace entreprise
@router.post("/entreprise/espaces/{espace_id}/members", response_model=EspaceMemberOut, status_code=status.HTTP_201_CREATED)
def invite_entreprise_espace_member_endpoint(
    espace_id: str,
    membre_in: WorkspaceMemberInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    """Invite un utilisateur dans un espace (contexte entreprise) via email et token."""
    espace = get_entreprise_espace(db, current_entreprise.id, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve ou acces refuse")
    _require_espace_invitation_access(
        db,
        espace_id,
        espace.id_workspace,
        current_entreprise.id,
        membre_in.role,
    )

    result = invite_member_to_espace(db, espace_id, membre_in)
    email_target = membre_in.email or membre_in.username

    if "membre" not in result:
        raise HTTPException(
            status_code=400,
            detail="Le flux entreprise requiert un utilisateur deja existant.",
        )

    membre = result["membre"]
    invitation_token = result["invitation_token"]
    target_user = membre.utilisateur

    # Envoi de l'email
    background_tasks.add_task(
        send_espace_invitation_email,
        current_entreprise.username,
        target_user.username if target_user and target_user.username else email_target,
        target_user.email if target_user and target_user.email else email_target,
        espace.nom,
        membre_in.role,
        invitation_token,
    )

    return _serialize_member(membre)

#Accepter une invitation à un espace entreprise via token
@router.post("/entreprise/espaces/invitations/accept", response_model=EspaceMemberOut)
def accept_entreprise_espace_invitation_endpoint(
    invitation_in: EspaceInvitationAcceptRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Accepte une invitation espace via le meme flux securise que l'API utilisateur."""
    membre = accept_espace_invitation(
        db,
        espace_id=None,
        user_id=current_user.id,
        invitation_token=invitation_in.token,
    )
    return _serialize_member(membre)

#Modifier le rôle d'un membre dans un espace entreprise, uniquement si l'utilisateur est admin de l'espace
@router.put("/entreprise/espaces/{espace_id}/members/{user_id}", response_model=EspaceMemberOut)
def update_entreprise_espace_member_endpoint(
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    espace = get_entreprise_espace(db, current_entreprise.id, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve ou acces refuse")
    _require_espace_member_management_access(
        db,
        espace_id,
        espace.id_workspace,
        current_entreprise.id,
        user_id,
        membre_in.role,
    )

    updated = update_entreprise_espace_member(db, current_entreprise.id, espace_id, user_id, membre_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Espace ou membre introuvable")
    return _serialize_member(updated)

# Supprimer un membre d'un espace ou retirer son accès si l'utilisateur est admin de l'espace entreprise
@router.delete("/entreprise/espaces/{espace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_entreprise_espace_member_endpoint(
    espace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_entreprise: UtilisateurOut = Depends(get_current_active_entreprise),
):
    espace = get_entreprise_espace(db, current_entreprise.id, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve ou acces refuse")
    _require_espace_member_management_access(
        db,
        espace_id,
        espace.id_workspace,
        current_entreprise.id,
        user_id,
    )

    success = remove_entreprise_espace_member(db, current_entreprise.id, espace_id, user_id)
    if success is None:
        raise HTTPException(status_code=404, detail="Espace introuvable")
    if not success:
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression du membre")
    return None
