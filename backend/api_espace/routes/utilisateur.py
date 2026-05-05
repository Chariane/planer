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
    _serialize_member,
    _require_workspace_read_access
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
    """Liste à plat de TOUS les espaces du workspace auxquels l'utilisateur a accès."""
    _get_workspace_or_404(db, workspace_id)
    _require_workspace_read_access(db, workspace_id, current_user.id)
    
    # On filtre les résultats si l'utilisateur n'est pas membre complet du workspace
    all_espaces = get_espaces_for_workspace(db, workspace_id)
    
    # Vérifier si membre workspace
    try:
        _get_workspace_member_or_403(db, workspace_id, current_user.id)
        return all_espaces
    except HTTPException:
        # Non membre -> filtrer par accessibilité
        from ..crud.utilisateur import get_espace_member
        return [esp for esp in all_espaces if get_espace_member(db, esp.id, current_user.id)]

# Récupérer uniquement les espaces de premier niveau (sans parent) d'un workspace
@router.get("/workspaces/{workspace_id}/espaces/roots", response_model=List[EspaceOut])
def list_workspace_root_espaces(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Liste uniquement les espaces de niveau 1 (sans parent)."""
    _get_workspace_or_404(db, workspace_id)
    _require_workspace_read_access(db, workspace_id, current_user.id)
    
    # Si membre workspace -> tout, sinon on utilise l'arbre filtré pour extraire les racines
    try:
        _get_workspace_member_or_403(db, workspace_id, current_user.id)
        return get_root_espaces_for_workspace(db, workspace_id)
    except HTTPException:
        tree = get_workspace_espaces_tree(db, workspace_id, current_user.id)
        # On retourne les eléments de premier niveau de l'arbre filtré
        results = []
        for node in tree:
            # Re-sérialisation vers EspaceOut (on a les champs nécessaires dans node)
            results.append(node)
        return results

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
    _require_workspace_read_access(db, workspace_id, current_user.id)
    return get_workspace_espaces_tree(db, workspace_id, user_id=current_user.id)

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

    # Validation stricte des rôles
    actor_member = _require_espace_management_access(db, espace_id, espace.id_workspace, current_user.id)
    if actor_member.role == "Administrateur" and membre_in.role not in ["Membre", "Invité"]:
        raise HTTPException(
            status_code=403,
            detail="En tant qu'Administrateur, vous pouvez uniquement inviter des Membres ou des Invités."
        )

    result = invite_member_to_espace(db, espace_id, membre_in)
    email_target = membre_in.email or membre_in.username 

    if "membre" in result:
        membre = result["membre"]
        token = result["invitation_token"]
        target_name = membre.utilisateur.username if (membre.utilisateur and membre.utilisateur.username) else email_target
        
        background_tasks.add_task(
            send_espace_invitation_email,
            current_user.username,
            target_name,
            email_target,
            espace.nom,
            membre_in.role,
            token,
            is_guest=False
        )
        return {
            "status": "existing_user",
            "message": "Invitation envoyee a l'utilisateur existant.",
            "email": email_target,
            "membre": _serialize_member(membre)
        }
    else:
        token = result["token"]
        background_tasks.add_task(
            send_espace_invitation_email,
            current_user.username,
            email_target,
            email_target,
            espace.nom,
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


# Accepter une invitation à un espace via token (endpoint authentifié)
@router.post("/espaces/invitations/accept", response_model=EspaceMemberOut)
def accept_espace_invitation_endpoint(
    invitation_in: EspaceInvitationAcceptRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    """Accepte une invitation a un espace (classique ou JWT guest)."""
    membre = accept_espace_invitation(
        db, 
        espace_id=None,
        user_id=current_user.id,
        invitation_token=invitation_in.token
    )
    return _serialize_member(membre)


# Acceptation directe depuis l'email (pas d'authentification requise)
@router.get("/espaces/invitations/accept-from-email")
def accept_espace_invitation_from_email(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Accepte une invitation a un espace directement depuis le lien email.
    Pas d'authentification requise — le token JWT contient le sub de l'utilisateur.
    Retourne une page HTML avec le resultat.
    """
    from fastapi.responses import HTMLResponse

    def _html_page(title: str, icon: str, message: str, sub_message: str = "", color: str = "#264a67") -> HTMLResponse:
        html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - K-Planer</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }}
        .card {{
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            padding: 48px;
            max-width: 480px;
            width: 100%;
            text-align: center;
        }}
        .icon {{ font-size: 64px; margin-bottom: 20px; }}
        h1 {{ color: {color}; font-size: 1.5rem; margin-bottom: 12px; }}
        .message {{ color: #555; font-size: 1rem; line-height: 1.6; margin-bottom: 16px; }}
        .sub-message {{ color: #999; font-size: 0.85rem; line-height: 1.5; }}
        .brand {{ margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; color: #bbb; font-size: 0.8rem; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">{icon}</div>
        <h1>{title}</h1>
        <p class="message">{message}</p>
        {"<p class='sub-message'>" + sub_message + "</p>" if sub_message else ""}
        <div class="brand">K-Planer &mdash; Votre espace de travail collaboratif</div>
    </div>
</body>
</html>"""
        return HTMLResponse(content=html, status_code=200)

    # 1. Décodage du token
    payload = decode_invitation_token(token)
    if not payload:
        return _html_page(
            title="Lien invalide",
            icon="❌",
            message="Ce lien d'invitation est invalide ou a expiré.",
            sub_message="Demandez à l'administrateur de vous renvoyer une nouvelle invitation.",
            color="#dc3545"
        )

    # 2. Extraire le user_id du token (sub)
    user_id = payload.get("sub")
    if not user_id:
        return _html_page(
            title="Lien non compatible",
            icon="⚠️",
            message="Ce lien est destiné à un nouvel utilisateur. Veuillez vous inscrire sur la plateforme pour accepter l'invitation.",
            color="#f0ad4e"
        )

    # 3. Vérifier si déjà acceptée
    target_espace_id = payload.get("espace_id")
    if target_espace_id:
        existing = get_espace_member(db, target_espace_id, user_id)
        if existing and existing.statut == "Actif":
            espace = get_espace_by_id(db, target_espace_id)
            espace_nom = espace.nom if espace else "l'espace"
            return _html_page(
                title="Invitation déjà acceptée",
                icon="✅",
                message=f"Vous êtes déjà membre actif de l'espace « {espace_nom} ».",
                sub_message="Connectez-vous sur K-Planer pour accéder à votre espace de travail."
            )

    # 4. Accepter l'invitation
    try:
        membre = accept_espace_invitation(
            db,
            espace_id=None,
            user_id=user_id,
            invitation_token=token
        )
        espace = get_espace_by_id(db, membre.id_espace) if membre.id_espace else None
        espace_nom = espace.nom if espace else "l'espace"
        return _html_page(
            title="Invitation acceptée !",
            icon="🎉",
            message=f"Vous avez rejoint l'espace « {espace_nom} » avec succès.",
            sub_message="Connectez-vous sur K-Planer pour accéder à votre nouvel espace de travail."
        )
    except HTTPException as e:
        return _html_page(
            title="Erreur",
            icon="❌",
            message=e.detail or "Une erreur est survenue lors de l'acceptation.",
            color="#dc3545"
        )
    
# Modifier le rôle d'un membre dans un espace
@router.put("/espaces/{espace_id}/members/{user_id}/update_member_espace", response_model=EspaceMemberOut)
def update_espace_member_endpoint(
    espace_id: str,
    user_id: str,
    membre_in: WorkspaceMemberUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    from ..core.function import _get_espace_actor_context, _validate_espace_member_management_permissions

    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    
    espace_obj, actor_member, actor_role = _get_espace_actor_context(db, espace_id, current_user.id)

    target_member = get_espace_member(db, espace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=400, detail="Impossible de modifier le role du createur")

    _validate_espace_member_management_permissions(espace_obj, actor_role, user_id, target_member, membre_in.role)

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
    from ..core.function import _get_espace_actor_context, _validate_espace_member_management_permissions

    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    
    espace_obj, actor_member, actor_role = _get_espace_actor_context(db, espace_id, current_user.id)

    target_member = get_espace_member(db, espace_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre non trouve")
    if target_member.role == "Créateur":
        raise HTTPException(status_code=403, detail="Le createur de l'espace ne peut pas etre supprime")

    _validate_espace_member_management_permissions(espace_obj, actor_role, user_id, target_member)

    if not remove_espace_member(db, espace_id, user_id):
        raise HTTPException(status_code=400, detail="Erreur lors de la suppression du membre")
    return None
