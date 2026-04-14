from typing import List, Optional
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.function import (
    _get_workspace_or_404,
    _get_workspace_member_or_403,
    _get_espace_or_404,
    _require_espace_access,
    _require_espace_management_access,
    _require_workspace_management_access,
    _serialize_member,
    can_create_espace,
)
from ..core.security import get_current_user, create_access_token, SECRET_KEY, ALGORITHM
from ..core.emails import send_espace_invitation_email
from ..crud.utilisateur import (
    add_member_to_espace,
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

router = APIRouter(tags=["Espaces"])


@router.post("/workspaces/{workspace_id}/espaces", response_model=EspaceOut, status_code=status.HTTP_201_CREATED)
def create_espace_endpoint(
    workspace_id: str,
    espace_in: EspaceCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Créer un espace rattaché à un workspace."""
    workspace = _get_workspace_or_404(db, workspace_id)
    _require_workspace_management_access(db, workspace_id, current_user.id)

    if workspace.id_utilisateur and not can_create_espace(db, workspace.id_utilisateur):
        raise HTTPException(
            status_code=403,
            detail="Compte non premium: vous avez droit a un seul workspace et un seul espace.",
        )

    espace_payload = espace_in.model_copy(update={"id_workspace": workspace_id, "id_espace_parent": None})
    return create_espace(db, espace_payload, current_user.id)


@router.post("/espaces/{espace_id}/sous-espaces", response_model=EspaceOut, status_code=status.HTTP_201_CREATED)
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


@router.get("/workspaces/{workspace_id}/espaces", response_model=List[EspaceOut])
def list_workspaces_espaces(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste à plat de TOUS les espaces du workspace."""
    _get_workspace_or_404(db, workspace_id)
    _get_workspace_member_or_403(db, workspace_id, current_user.id)
    return get_espaces_for_workspace(db, workspace_id)


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


@router.get("/espaces/{espace_id}", response_model=EspaceOut)
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


@router.put("/espaces/{espace_id}", response_model=EspaceOut)
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


@router.delete("/espaces/{espace_id}", status_code=status.HTTP_204_NO_CONTENT)
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


@router.get("/espaces/{espace_id}/members", response_model=List[EspaceMemberOut])
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


@router.post("/espaces/{espace_id}/members", response_model=EspaceMemberOut, status_code=status.HTTP_201_CREATED)
def invite_espace_member(
    espace_id: str,
    membre_in: WorkspaceMemberInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Invite un utilisateur dans un espace via email et token (comme workspace)."""
    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)

    target_user = db.query(Utilisateur).filter(Utilisateur.email == membre_in.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur invite non trouve")

    # Création du membre en statut 'En attente'
    membre = invite_member_to_espace(db, espace_id, target_user.id, membre_in.role)

    # Génération du token d'invitation
    invitation_token = create_access_token(
        {
            "sub": target_user.id,
            "espace_id": espace_id,
            "scope": "espace_invitation_accept",
        },
        expires_delta=timedelta(days=7),
    )

    # Envoi de l'email
    background_tasks.add_task(
        send_espace_invitation_email,
        current_user.username,
        target_user.username,
        target_user.email,
        espace.nom,
        membre_in.role,
        invitation_token,
    )

    return _serialize_member(membre)


@router.post("/espaces/invitations/accept", response_model=EspaceMemberOut)
def accept_espace_invitation_endpoint(
    invitation_in: EspaceInvitationAcceptRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Accepte une invitation a un espace en utilisant un token JWT."""
    try:
        payload = jwt.decode(invitation_in.token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invitation invalide ou expiree")

    if payload.get("scope") != "espace_invitation_accept":
        raise HTTPException(status_code=400, detail="Token d'invitation invalide")

    invited_user_id = payload.get("sub")
    espace_id = payload.get("espace_id")

    if not invited_user_id or not espace_id:
        raise HTTPException(status_code=400, detail="Token d'invitation invalide")

    if invited_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas accepter cette invitation")

    membre = accept_espace_invitation(db, espace_id, invited_user_id)
    if not membre:
        raise HTTPException(status_code=404, detail="Invitation non trouvee ou deja acceptee")

    return _serialize_member(membre)


@router.put("/espaces/{espace_id}/members/{user_id}", response_model=EspaceMemberOut)
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


@router.delete("/espaces/{espace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
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
