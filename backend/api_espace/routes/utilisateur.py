from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from jose import jwt
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.function import (
    _get_workspace_or_404,
    _get_workspace_member_or_403,
    _get_espace_or_404,
    _require_espace_access,
    _require_espace_management_access,
    _require_workspace_management_access,
    _serialize_member
)
from ..core.security import get_current_user, decode_invitation_token, SECRET_KEY, ALGORITHM
from ..core.emails import send_espace_invitation_email
from ..crud.utilisateur import (
    create_espace,
    delete_espace,
    get_espace_by_id,
    get_espace_member,
    get_espace_members,
    get_espaces_for_workspace,
    get_root_espaces_for_workspace,
    get_sub_espaces_for_parent,
    get_workspace_espaces_tree,
    invite_member_to_espace,
    accept_espace_invitation,
    remove_espace_member,
    update_espace,
    update_espace_member,
)
from ..schemas import (
    EspaceCreate,
    EspaceOut,
    EspaceTreeOut,
    EspaceUpdate,
    EspaceMemberOut,
    EspaceInvitationAcceptRequest,
    EspaceInvitationResponse,
    UtilisateurOut,
    WorkspaceMemberInvite,
    WorkspaceMemberUpdate
)

router = APIRouter(tags=["Espaces"])

#creer un espace rattaché à un workspace
@router.post("/workspaces/{workspace_id}/create_espace", response_model=EspaceOut, status_code=status.HTTP_201_CREATED)
def create_espace_endpoint(
    workspace_id: str,
    espace_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Créer un espace rattaché à un workspace."""
    workspace = _get_workspace_or_404(db, workspace_id)
    _require_workspace_management_access(db, workspace_id, current_user.id)

    espace_payload = espace_in.model_copy(update={"id_workspace": workspace_id, "id_espace_parent": None})
    return create_espace(db, espace_payload, current_user.id)

#creer un espace rattaché à un espace parent (sous-espace)
@router.post("/espaces/{espace_id}/create_sous_espace", response_model=EspaceOut, status_code=status.HTTP_201_CREATED)
def create_sous_espace_endpoint(
    espace_id: str,
    espace_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Créer un sous-espace rattaché à un espace parent."""
    parent_espace = get_espace_by_id(db, espace_id)
    if not parent_espace:
        raise HTTPException(status_code=404, detail="Espace parent non trouve")

    _require_espace_management_access(db, espace_id, parent_espace.id_workspace, current_user.id)

    espace_payload = espace_in.model_copy(update={
        "id_espace_parent": espace_id,
        "id_workspace": parent_espace.id_workspace,
    })
    return create_espace(db, espace_payload, current_user.id)

# Récupérer l'arborescence complète des espaces d'un workspace
@router.get("/workspaces/{workspace_id}/list_workspace_espaces", response_model=List[EspaceOut])
def list_workspaces_espaces(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste à plat de TOUS les espaces du workspace."""
    _get_workspace_or_404(db, workspace_id)
    _get_workspace_member_or_403(db, workspace_id, current_user.id)
    return get_espaces_for_workspace(db, workspace_id)

# Récupérer uniquement les espaces de premier niveau (sans parent) d'un workspace
@router.get("/workspaces/{workspace_id}/espaces/roots", response_model=List[EspaceOut])
def list_workspace_root_espaces(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste uniquement les espaces de niveau 1 (sans parent)."""
    _get_workspace_or_404(db, workspace_id)
    _get_workspace_member_or_403(db, workspace_id, current_user.id)
    return get_root_espaces_for_workspace(db, workspace_id)

# Récupérer les sous-espaces directs d'un espace parent
@router.get("/espaces/{espace_id}/children", response_model=List[EspaceOut])
def list_espace_children(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste les sous-espaces directs d'un espace parent."""
    espace = _get_espace_or_404(db, espace_id)
    _require_espace_access(db, espace_id, espace.id_workspace, current_user.id)
    return get_sub_espaces_for_parent(db, espace_id)

# Récupérer l'arborescence complète des espaces d'un workspace (avec sous-espaces imbriqués)
@router.get("/workspaces/{workspace_id}/espaces/tree", response_model=List[EspaceTreeOut])
def get_workspace_espaces_tree_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Récupère l'arborescence complète (espaces et sous-espaces) du workspace."""
    _get_workspace_or_404(db, workspace_id)
    _get_workspace_member_or_403(db, workspace_id, current_user.id)
    return get_workspace_espaces_tree(db, workspace_id)

# Récupérer les espaces où l'utilisateur est admin
@router.get("/espaces/{espace_id}/get_espace", response_model=EspaceOut)
def get_espace_endpoint(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    _require_espace_access(db, espace_id, espace.id_workspace, current_user.id)
    return espace

# Modifier les espaces où l'utilisateur est admin
@router.put("/espaces/{espace_id}/update_espace", response_model=EspaceOut)
def update_espace_endpoint(
    espace_id: str,
    espace_in: EspaceUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
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

# Supprimer un espace (et ses sous-espaces) si l'utilisateur est admin
@router.delete("/espaces/{espace_id}/delete_espace", status_code=status.HTTP_204_NO_CONTENT)
def delete_espace_endpoint(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)
    if not delete_espace(db, espace_id):
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression de l'espace")
    return None

# Liste les membres d'un espace
@router.get("/espaces/{espace_id}/list_members_espace", response_model=List[EspaceMemberOut])
def list_espace_members(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    _require_espace_access(db, espace_id, espace.id_workspace, current_user.id)
    return [_serialize_member(m) for m in get_espace_members(db, espace_id)]

# Inviter un membre dans un espace
@router.post("/espaces/{espace_id}/invite_member_espace", response_model=EspaceInvitationResponse, status_code=status.HTTP_201_CREATED)
def invite_espace_member(
    espace_id: str,
    membre_in: WorkspaceMemberInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Invite un utilisateur dans un espace via email et token (existant ou guest)."""
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)

    email_target = membre_in.email or membre_in.username # Fallback simple

    result = invite_member_to_espace(db, espace_id, membre_in)
    
    if "membre" in result:
        # Cas utilisateur existant
        membre = result["membre"]
        token = result["invitation_token"]
        
        target_username = membre.utilisateur.username if membre.utilisateur else email_target
        
        background_tasks.add_task(
            send_espace_invitation_email,
            current_user.username,
            target_username,
            email_target,
            espace.nom,
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
            send_espace_invitation_email,
            current_user.username,
            email_target,
            email_target,
            espace.nom,
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

#Accepter une invitation à un espace via token
@router.post("/espaces/invitations/accept", response_model=EspaceMemberOut)
def accept_espace_invitation_endpoint(
    invitation_in: EspaceInvitationAcceptRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Accepte une invitation a un espace (classique ou JWT guest)."""
    # On délègue la logique de validation (JWT ou base) au CRUD
    membre = accept_espace_invitation(
        db, 
        espace_id=None, # Sera extrait du token si nécessaire
        user_id=current_user.id,
        invitation_token=invitation_in.token
    )
    
    # Note: comme nous avons besoin de l'espace_id pour le CRUD classique mais qu'il est 
    # dans le token pour le guest, nous devons peut-être l'extraire ici si ce n'est pas un guest.
    
    # RE-LOGIQUE pour supporter les deux cas proprement :
    try:
        payload = decode_invitation_token(invitation_in.token)
        if payload:
            espace_id = payload.get("espace_id")
        else:
            # Essayer de décoder pour le format classique (sub/espace_id/scope)
            payload_classic = jwt.decode(invitation_in.token, SECRET_KEY, algorithms=[ALGORITHM])
            espace_id = payload_classic.get("espace_id")
    except Exception:
        raise HTTPException(status_code=400, detail="Token d'invitation invalide")

    if not espace_id:
        raise HTTPException(status_code=400, detail="ID d'espace manquant dans le token")

    membre = accept_espace_invitation(
        db, 
        espace_id=espace_id, 
        user_id=current_user.id,
        invitation_token=invitation_in.token
    )
    
    if not membre:
        raise HTTPException(status_code=404, detail="Invitation non trouvee ou deja acceptee")

    return _serialize_member(membre)

# Modifier le rôle d'un membre dans un espace
@router.put("/espaces/{espace_id}/members/{user_id}/update_member_espace", response_model=EspaceMemberOut)
def update_espace_member_endpoint(
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)

    target_member = get_espace_member(db, espace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=400, detail="Impossible de modifier le role du createur")

    updated = update_espace_member(db, espace_id, user_id, membre_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    return _serialize_member(updated)

# Supprimer un membre d'un espace ou retirer son accès si l'utilisateur est admin
@router.delete("/espaces/{espace_id}/members/{user_id}/remove_member_espace", status_code=status.HTTP_204_NO_CONTENT)
def remove_espace_member_endpoint(
    espace_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)

    target_member = get_espace_member(db, espace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=403, detail="Le createur de l'espace ne peut pas etre supprime")

    if not remove_espace_member(db, espace_id, user_id):
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression du membre")
    return None
