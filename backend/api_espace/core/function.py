from datetime import datetime
from typing import Any, Optional
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..models import Espace, Membre, PlanerEntreprise, Utilisateur, Workspace

# Rôles Workspace
WORKSPACE_OWNER_ROLE = "Créateur"
WORKSPACE_ADMIN_ROLE = "Administrateur"
WORKSPACE_MEMBER_ROLE = "Membre"
WORKSPACE_GUEST_ROLE = "Invité"

WORKSPACE_READ_ROLES = {
    WORKSPACE_OWNER_ROLE,
    WORKSPACE_ADMIN_ROLE,
    WORKSPACE_MEMBER_ROLE,
    WORKSPACE_GUEST_ROLE,
}
WORKSPACE_MANAGEMENT_ROLES = {WORKSPACE_OWNER_ROLE, WORKSPACE_ADMIN_ROLE}
WORKSPACE_DESCENDANT_READ_ROLES = {
    WORKSPACE_OWNER_ROLE,
    WORKSPACE_ADMIN_ROLE,
    WORKSPACE_GUEST_ROLE,
}

# Rôles Espace
ESPACE_OWNER_ROLE = "Créateur"
ESPACE_ADMIN_ROLE = "Administrateur"
ESPACE_MEMBER_ROLE = "Membre"
ESPACE_GUEST_ROLE = "Invité"

ESPACE_READ_ROLES = {
    ESPACE_OWNER_ROLE,
    ESPACE_ADMIN_ROLE,
    ESPACE_MEMBER_ROLE,
    ESPACE_GUEST_ROLE,
}
ESPACE_MANAGEMENT_ROLES = {ESPACE_OWNER_ROLE, ESPACE_ADMIN_ROLE}
ESPACE_ADMIN_MANAGEABLE_ROLES = {ESPACE_MEMBER_ROLE, ESPACE_GUEST_ROLE}
ESPACE_DESCENDANT_READ_ROLES = {
    ESPACE_OWNER_ROLE,
    ESPACE_ADMIN_ROLE,
    ESPACE_GUEST_ROLE,
}



def commit_or_raise(
    db: Session,
    *,
    detail: str,
    status_code: int = 409,
    refresh_instance: Any | None = None,
) -> None:
    try:
        db.commit()
        if refresh_instance is not None:
            db.refresh(refresh_instance)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status_code, detail=detail) from exc


def render_invitation_html_page(
    title: str,
    icon: str,
    message: str,
    sub_message: str = "",
    color: str = "#264a67",
) -> HTMLResponse:
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
        .icon {{
            font-size: 64px;
            margin-bottom: 20px;
        }}
        h1 {{
            color: {color};
            font-size: 1.5rem;
            margin-bottom: 12px;
        }}
        .message {{
            color: #555;
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 16px;
        }}
        .sub-message {{
            color: #999;
            font-size: 0.85rem;
            line-height: 1.5;
        }}
        .brand {{
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #bbb;
            font-size: 0.8rem;
        }}
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


def is_premium_user(user: Optional[Utilisateur]) -> bool:
    if not user or user.type_compte != "Premium":
        return False
    return user.premium_expire_at is not None and user.premium_expire_at > datetime.utcnow()


def is_premium_entreprise(entreprise: Optional[PlanerEntreprise]) -> bool:
    if not entreprise or not entreprise.is_premium or entreprise.statut_compte != "Actif":
        return False
    return entreprise.premium_expire_at is not None and entreprise.premium_expire_at > datetime.utcnow()


def user_has_premium_workspace_access(db: Session, user_id: str) -> bool:
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if is_premium_user(user):
        return True

    entreprise = db.query(PlanerEntreprise).filter(PlanerEntreprise.id_utilisateur == user_id).first()
    return is_premium_entreprise(entreprise)


def get_espace_count_for_owner(db: Session, user_id: str) -> int:
    return (
        db.query(Espace)
        .join(Workspace, Espace.id_workspace == Workspace.id)
        .filter(Workspace.id_utilisateur == user_id)
        .count()
    )


def can_create_espace(db: Session, user_id: str) -> bool:
    if user_has_premium_workspace_access(db, user_id):
        return True
    return get_espace_count_for_owner(db, user_id) < 1


# -----------------------------------------------
# Sérialiseurs
# -----------------------------------------------

def _serialize_member(membre):
    utilisateur = membre.utilisateur
    return {
        "id": membre.id,
        "created_at": membre.created_at,
        "role": membre.role,
        "statut": membre.statut,
        "id_utilisateur": membre.id_utilisateur,
        "id_workspace": membre.id_workspace,
        "id_espace": membre.id_espace,
        "id_liste": membre.id_liste,
        "id_tache": membre.id_tache,
        "utilisateur": (
            {
                "id": utilisateur.id,
                "username": utilisateur.username,
                "email": utilisateur.email,
                "nom": utilisateur.nom,
                "prenoms": utilisateur.prenoms,
            }
            if utilisateur
            else None
        ),
    }


# -----------------------------------------------
# Helpers d'accès — Workspace
# -----------------------------------------------

def _get_workspace_or_404(db: Session, workspace_id: str) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")
    return workspace


def _get_espace_member_record(db: Session, espace_id: str, user_id: str) -> Optional[Membre]:
    return (
        db.query(Membre)
        .filter(
            Membre.id_espace == espace_id,
            Membre.id_utilisateur == user_id,
        )
        .first()
    )


def _get_active_ancestor_espace_member(
    db: Session,
    espace: Espace,
    user_id: str,
) -> Optional[Membre]:
    parent_id = espace.id_espace_parent

    while parent_id:
        parent_espace = db.query(Espace).filter(Espace.id == parent_id).first()
        if not parent_espace:
            return None

        parent_member = _get_espace_member_record(db, parent_espace.id, user_id)
        if parent_member and parent_member.statut == "Actif":
            return parent_member

        parent_id = parent_espace.id_espace_parent

    return None


def _get_active_ancestor_espace_manager(
    db: Session,
    espace: Espace,
    user_id: str,
) -> Optional[Membre]:
    ancestor_member = _get_active_ancestor_espace_member(db, espace, user_id)
    if ancestor_member and ancestor_member.role in ESPACE_MANAGEMENT_ROLES:
        return ancestor_member
    return None


def _get_active_ancestor_espace_descendant_reader(
    db: Session,
    espace: Espace,
    user_id: str,
) -> Optional[Membre]:
    ancestor_member = _get_active_ancestor_espace_member(db, espace, user_id)
    if ancestor_member and ancestor_member.role in ESPACE_DESCENDANT_READ_ROLES:
        return ancestor_member
    return None


def _get_workspace_member_or_403(db: Session, workspace_id: str, current_user_id: str):

    membre = (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif",
        )
        .first()
    )

    if membre:
        return membre

    # Fallback : le créateur du workspace a toujours accès (rôle Créateur)
    ws = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.id_utilisateur == current_user_id
    ).first()
    if ws:
        return Membre(
            id_utilisateur=current_user_id,
            id_workspace=workspace_id,
            role=WORKSPACE_OWNER_ROLE,
            statut="Actif",
        )

    raise HTTPException(status_code=403, detail="Acces refuse au workspace")


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants sur le workspace")
    return membre


def _require_workspace_descendant_read_access(db: Session, workspace_id: str, current_user_id: str):
    """Donne un accès de lecture descendante sur le contenu du workspace."""
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_DESCENDANT_READ_ROLES:
        raise HTTPException(status_code=403, detail="Acces refuse au contenu du workspace")
    return membre


def _require_workspace_read_access(db: Session, workspace_id: str, current_user_id: str):
    """Donne l'accès complet au workspace uniquement aux membres directs actifs."""
    return _get_workspace_member_or_403(db, workspace_id, current_user_id)


def _get_espace_actor_context(
    db: Session,
    espace_id: str,
    current_user_id: str,
):
    espace = _get_espace_or_404(db, espace_id)
    actor_member = _require_espace_management_access(
        db,
        espace_id,
        espace.id_workspace,
        current_user_id,
    )
    return espace, actor_member, actor_member.role


def _validate_espace_member_management_permissions(
    espace: Espace,
    actor_role: str,
    target_user_id: str,
    target_member: Optional[Membre],
    new_role: Optional[str] = None,
):
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")

    if target_member.role == ESPACE_OWNER_ROLE:
        raise HTTPException(
            status_code=403,
            detail="Le créateur de l'espace ne peut pas être modifié ou retiré.",
        )

    # REGLE 1 : Un Admin ne peut pas modifier un autre Admin ou le Créateur
    if actor_role == ESPACE_ADMIN_ROLE and target_member.role not in ESPACE_ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Seul le créateur peut modifier ce membre.",
        )

    # REGLE 2 : Un Admin ne peut pas promouvoir quelqu'un à un rôle supérieur (Admin ou Créateur)
    if actor_role == ESPACE_ADMIN_ROLE and new_role and new_role not in ESPACE_ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="En tant qu'administrateur, vous ne pouvez pas promouvoir un membre à ce rôle.",
        )

    # REGLE 3 : Seul un manager (Admin/Créateur) peut accéder à cette fonction
    if actor_role not in ESPACE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Permissions insuffisantes pour gerer les membres de cet espace.",
        )


def _validate_espace_invitation_permissions(actor_role: str, invited_role: str):
    if actor_role == ESPACE_ADMIN_ROLE and invited_role not in ESPACE_ADMIN_MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Un administrateur ne peut inviter que des membres ou invites dans l'espace.",
        )


# -----------------------------------------------
# Helpers d'accès — Espace
# -----------------------------------------------

def _get_espace_or_404(db: Session, espace_id: str) -> Espace:
    espace = db.query(Espace).filter(Espace.id == espace_id).first()
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return espace


def _require_espace_access(db: Session, espace_id: str, workspace_id: str, current_user_id: str):
    """
    Vérifie l'accès au contenu d'un espace.

    Autorise l'accès si l'utilisateur est :
    - membre actif direct de l'espace
    - membre actif du workspace parent
    - membre actif d'un espace ancêtre
    """
    espace = _get_espace_or_404(db, espace_id)

    espace_member = _get_espace_member_record(db, espace_id, current_user_id)
    if espace_member and espace_member.statut == "Actif":
        return espace_member

    try:
        return _require_workspace_descendant_read_access(db, workspace_id, current_user_id)
    except HTTPException:
        pass

    ancestor_member = _get_active_ancestor_espace_descendant_reader(
        db, espace, current_user_id
    )
    if ancestor_member:
        return ancestor_member

    raise HTTPException(status_code=403, detail="Acces refuse a l'espace")


def _require_espace_visibility_access(
    db: Session,
    espace_id: str,
    workspace_id: str,
    current_user_id: str,
):
    """Vérifie l'accès de lecture descendante sur les enfants d'un espace."""
    espace = _get_espace_or_404(db, espace_id)

    espace_member = _get_espace_member_record(db, espace_id, current_user_id)
    if (
        espace_member
        and espace_member.statut == "Actif"
        and espace_member.role in ESPACE_DESCENDANT_READ_ROLES
    ):
        return espace_member

    try:
        return _require_workspace_descendant_read_access(db, workspace_id, current_user_id)
    except HTTPException:
        pass

    ancestor_member = _get_active_ancestor_espace_descendant_reader(
        db, espace, current_user_id
    )
    if ancestor_member:
        return ancestor_member

    raise HTTPException(status_code=403, detail="Acces refuse au contenu descendant de l'espace")


def _require_espace_management_access(db: Session, espace_id: str, workspace_id: Optional[str], current_user_id: str):
    """Vérifie l'accès de gestion à un espace.
    
    Donne l'accès si l'utilisateur est :
    1. Le propriétaire du Workspace parent (maître)
    2. Un membre de l'espace avec rôle 'Créateur' ou 'Administrateur'
    3. Un administrateur du Workspace parent
    """
    # 1. Résolution du workspace_id si manquant
    if not workspace_id:
        espace = db.query(Espace).filter(Espace.id == espace_id).first()
        if espace:
            workspace_id = espace.id_workspace

    # 2. Vérification PROPRIÉTAIRE DU WORKSPACE (Le Maître)
    if workspace_id:
        ws = db.query(Workspace).filter(
            Workspace.id == workspace_id,
            Workspace.id_utilisateur == current_user_id
        ).first()
        if ws:
            # Le créateur du workspace a tous les droits
            return Membre(role=WORKSPACE_OWNER_ROLE, statut="Actif")

    # 3. Vérification MEMBRE DIRECT DE L'ESPACE
    espace_member = _get_espace_member_record(db, espace_id, current_user_id)
    if (
        espace_member
        and espace_member.statut == "Actif"
        and espace_member.role in ESPACE_MANAGEMENT_ROLES
    ):
        return espace_member

    # 4. Vérification ESPACE ANCETRE (Créateur/Admin)
    espace = _get_espace_or_404(db, espace_id)
    ancestor_manager = _get_active_ancestor_espace_manager(db, espace, current_user_id)
    if ancestor_manager:
        return ancestor_manager

    # 5. Vérification ADMINISTRATEUR DU WORKSPACE
    if workspace_id:
        ws_admin = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == current_user_id,
            Membre.role == WORKSPACE_ADMIN_ROLE,
            Membre.statut == "Actif"
        ).first()
        if ws_admin:
            return ws_admin

    raise HTTPException(status_code=403, detail="Acces refuse a l'espace")


def _require_espace_admin_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie que l'utilisateur est administrateur (Créateur ou Administrateur) de l'espace.

    Retourne un tuple (espace, membre).
    Lève une 404 si l'espace n'existe pas,
    une 403 si l'utilisateur n'a pas les droits d'administration.
    """
    espace = _get_espace_or_404(db, espace_id)
    membre = _require_espace_management_access(
        db,
        espace_id,
        espace.id_workspace,
        current_user_id,
    )
    return espace, membre


def _require_espace_member_management_access(
    db: Session,
    espace_id: str,
    workspace_id: Optional[str],
    current_user_id: str,
    target_user_id: str,
    new_role: Optional[str] = None,
):
    espace, actor_member, actor_role = _get_espace_actor_context(db, espace_id, current_user_id)
    target_member = _get_espace_member_record(db, espace_id, target_user_id)
    _validate_espace_member_management_permissions(
        espace,
        actor_role,
        target_user_id,
        target_member,
        new_role,
    )
    return espace, actor_member, actor_role, target_member


def _require_espace_invitation_access(
    db: Session,
    espace_id: str,
    workspace_id: Optional[str],
    current_user_id: str,
    invited_role: str,
):
    espace, actor_member, actor_role = _get_espace_actor_context(db, espace_id, current_user_id)
    _validate_espace_invitation_permissions(actor_role, invited_role)
    return espace, actor_member, actor_role


def _require_espace_owner_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie que l'utilisateur est le créateur de l'espace.

    Retourne un tuple (espace, membre).
    """
    espace = _get_espace_or_404(db, espace_id)

    espace_member = _get_espace_member_record(db, espace_id, current_user_id)
    if espace_member and espace_member.role == "Créateur":
        return espace, espace_member

    raise HTTPException(
        status_code=403,
        detail="Seul le createur peut effectuer cette action",
    )
