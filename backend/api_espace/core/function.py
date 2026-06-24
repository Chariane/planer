# backend/api_espace/core/function.py
import base64
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
    WORKSPACE_MEMBER_ROLE,
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
    ESPACE_MEMBER_ROLE,
    ESPACE_GUEST_ROLE,
}


class ResourceType:
    WORKSPACE = "workspace"
    ESPACE = "espace"


ROLE_HIERARCHY = {
    WORKSPACE_GUEST_ROLE: 1,
    WORKSPACE_MEMBER_ROLE: 2,
    WORKSPACE_ADMIN_ROLE: 3,
    WORKSPACE_OWNER_ROLE: 4,
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


def _get_role_rank(role: Optional[str]) -> int:
    if role is None:
        return 0
    return ROLE_HIERARCHY.get(role, 0)


def _get_active_workspace_membership(
    db: Session,
    workspace_id: str,
    user_id: str,
) -> Optional[Membre]:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace and workspace.id_utilisateur == user_id:
        return Membre(
            id_utilisateur=user_id,
            id_workspace=workspace_id,
            role=WORKSPACE_OWNER_ROLE,
            statut="Actif",
        )

    return (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id,
            Membre.statut == "Actif",
        )
        .first()
    )


def _append_inherited_candidate(
    candidates: list[tuple[str, str, str]],
    *,
    role: Optional[str],
    resource_type: str,
    resource_id: Optional[str],
) -> None:
    if role in WORKSPACE_DESCENDANT_READ_ROLES and resource_id:
        candidates.append((role, resource_type, resource_id))


def get_parent_inherited_role(
    db: Session,
    user_id: str,
    target_type: str,
    target_id: str,
) -> Optional[tuple[str, str, str]]:
    if target_type != ResourceType.ESPACE:
        raise HTTPException(status_code=400, detail="Type de ressource invalide pour cet API.")

    espace = db.query(Espace).filter(Espace.id == target_id).first()
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve.")

    candidates: list[tuple[str, str, str]] = []

    workspace_member = _get_active_workspace_membership(db, espace.id_workspace, user_id)
    if workspace_member:
        _append_inherited_candidate(
            candidates,
            role=workspace_member.role,
            resource_type=ResourceType.WORKSPACE,
            resource_id=espace.id_workspace,
        )

    parent_id = espace.id_espace_parent
    while parent_id:
        parent_member = _get_espace_member_record(db, parent_id, user_id)
        if parent_member and parent_member.statut == "Actif":
            _append_inherited_candidate(
                candidates,
                role=parent_member.role,
                resource_type=ResourceType.ESPACE,
                resource_id=parent_id,
            )

        parent_espace = db.query(Espace).filter(Espace.id == parent_id).first()
        if not parent_espace:
            break
        parent_id = parent_espace.id_espace_parent

    if not candidates:
        return None

    return max(candidates, key=lambda item: _get_role_rank(item[0]))


def validate_role_hierarchy(
    db: Session,
    user_id: str,
    target_type: str,
    target_id: str,
    new_role: str,
) -> Optional[tuple[str, str, str]]:
    inherited = get_parent_inherited_role(db, user_id, target_type, target_id)
    if not inherited:
        return None

    inherited_role, source_type, source_id = inherited
    if _get_role_rank(inherited_role) >= _get_role_rank(new_role):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Invitation non nécessaire : cette personne possède déjà le rôle "
                f"'{inherited_role}' hérité depuis un {source_type} parent. "
                f"Vous ne pouvez pas lui attribuer le rôle '{new_role}' sur cette ressource enfant, "
                "car ce rôle est inférieur ou équivalent à son rôle parent."
            ),
        )

    return inherited


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
                "photo_base64": base64.b64encode(utilisateur.photo).decode("ascii") if utilisateur and utilisateur.photo else None,
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


def _require_workspace_espace_navigation_access(
    db: Session,
    workspace_id: str,
    current_user_id: str,
):
    """
    Autorise la navigation des espaces d'un workspace soit par accès direct au workspace,
    soit par membership actif direct sur au moins un espace de ce workspace.
    """
    try:
        return _require_workspace_descendant_read_access(db, workspace_id, current_user_id)
    except HTTPException:
        pass

    espace_member = (
        db.query(Membre)
        .join(Espace, Membre.id_espace == Espace.id)
        .filter(
            Espace.id_workspace == workspace_id,
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif",
        )
        .first()
    )
    if espace_member:
        return espace_member

    raise HTTPException(status_code=403, detail="Acces refuse a la navigation des espaces du workspace")


def _require_workspace_read_access(db: Session, workspace_id: str, current_user_id: str):
    """Donne l'accès complet au workspace uniquement aux membres directs actifs."""
    return _get_workspace_member_or_403(db, workspace_id, current_user_id)


def _get_espace_management_grant(
    db: Session,
    espace_id: str,
    workspace_id: Optional[str],
    current_user_id: str,
):
    """
    Décrit l'origine du droit de gestion sur un espace.

    Retourne:
    (actor_member, role, source_type, source_id)
    """
    espace_member = _get_espace_member_record(db, espace_id, current_user_id)
    if (
        espace_member
        and espace_member.statut == "Actif"
        and espace_member.role in ESPACE_MANAGEMENT_ROLES
    ):
        return (
            espace_member,
            espace_member.role,
            "espace",
            espace_id,
        )

    if not workspace_id:
        espace = db.query(Espace).filter(Espace.id == espace_id).first()
        if espace:
            workspace_id = espace.id_workspace

    if workspace_id:
        ws = db.query(Workspace).filter(
            Workspace.id == workspace_id,
            Workspace.id_utilisateur == current_user_id
        ).first()
        if ws:
            return (
                Membre(role=WORKSPACE_OWNER_ROLE, statut="Actif"),
                WORKSPACE_OWNER_ROLE,
                "workspace",
                workspace_id,
            )

    espace = _get_espace_or_404(db, espace_id)
    parent_id = espace.id_espace_parent
    while parent_id:
        parent_member = _get_espace_member_record(db, parent_id, current_user_id)
        if (
            parent_member
            and parent_member.statut == "Actif"
            and parent_member.role in ESPACE_MANAGEMENT_ROLES
        ):
            return (
                parent_member,
                parent_member.role,
                "espace",
                parent_id,
            )

        parent_espace = db.query(Espace).filter(Espace.id == parent_id).first()
        if not parent_espace:
            break
        parent_id = parent_espace.id_espace_parent

    if workspace_id:
        ws_admin = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == current_user_id,
            Membre.role == WORKSPACE_ADMIN_ROLE,
            Membre.statut == "Actif"
        ).first()
        if ws_admin:
            return ws_admin, ws_admin.role, "workspace", workspace_id

    raise HTTPException(status_code=403, detail="Acces refuse a l'espace")


def _validate_espace_member_management_permissions(
    espace: Espace,
    actor_role: str,
    actor_source_type: str,
    actor_source_id: str,
    target_user_id: str,
    target_member: Optional[Membre],
    new_role: Optional[str] = None,
):
    """Valide les permissions de gestion des membres d'un espace."""
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Membre introuvable")

    # ✅ RÈGLE 1 : Le Créateur de l'espace ne peut pas être modifié ou retiré
    if target_member.role == ESPACE_OWNER_ROLE:
        is_creator_parent = (
            actor_role == ESPACE_OWNER_ROLE
            and (
                actor_source_type == "workspace"
                or actor_source_id != espace.id
            )
        )
        if not is_creator_parent:
            raise HTTPException(
                status_code=403,
                detail="Le créateur de l'espace ne peut pas être modifié ou retiré.",
            )

    # ✅ RÈGLE 2 : Un administrateur direct d'un espace ne peut modifier AUCUN membre
    if actor_role == ESPACE_ADMIN_ROLE and actor_source_type == "espace" and actor_source_id == espace.id:
        raise HTTPException(
            status_code=403,
            detail="Un administrateur direct de l'espace ne peut pas modifier les membres de cet espace. Seul le créateur peut le faire.",
        )

    # ✅ RÈGLE 3 : Un administrateur par héritage (workspace ou espace parent) 
    # peut modifier des membres, mais avec des restrictions spécifiques
    if actor_role == ESPACE_ADMIN_ROLE:
        # Si l'acteur n'est pas administrateur direct de l'espace (donc par héritage)
        if actor_source_type != "espace" or actor_source_id != espace.id:
            # ✅ L'administrateur par héritage peut :
            # - Membre → Admin
            # - Invité → Membre
            # - Invité → Admin
            if new_role and new_role != target_member.role:
                # ✅ Permettre toutes les promotions (Invité → Membre, Invité → Admin, Membre → Admin)
                # mais uniquement vers des rôles supérieurs
                if _get_role_rank(new_role) > _get_role_rank(target_member.role):
                    return
                else:
                    raise HTTPException(
                        status_code=403,
                        detail="Un administrateur par héritage ne peut que promouvoir un membre, pas le rétrograder.",
                    )
            return

    # ✅ RÈGLE 4 : Le Créateur direct peut tout modifier (sauf se modifier lui-même)
    if actor_role == ESPACE_OWNER_ROLE:
        if target_member.role == ESPACE_OWNER_ROLE:
            raise HTTPException(
                status_code=403,
                detail="Le créateur ne peut pas modifier son propre rôle.",
            )
        return

    # ✅ RÈGLE 5 : Seul un manager (Admin par héritage ou Créateur) peut accéder à cette fonction
    if actor_role not in ESPACE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Permissions insuffisantes pour gérer les membres de cet espace.",
        )


def _validate_espace_invitation_permissions(
    *,
    espace_id: str,
    actor_role: str,
    actor_source_type: str,
    actor_source_id: str,
    invited_role: str,
):
    """Valide les permissions d'invitation dans un espace."""

    # ✅ RÈGLE 1 : Seul un gestionnaire (Admin ou Créateur) peut inviter
    if actor_role not in ESPACE_MANAGEMENT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Seul un administrateur ou le créateur peut inviter des membres.",
        )

    # ✅ RÈGLE 2 : Un administrateur direct d'un espace ne peut pas inviter avec le rôle 'Administrateur'
    if actor_role == ESPACE_ADMIN_ROLE:
        is_direct_admin = (actor_source_type == "espace" and actor_source_id == espace_id)
        
        if is_direct_admin:
            # ✅ Admin direct : peut inviter uniquement avec Membre ou Invité
            if invited_role not in {ESPACE_MEMBER_ROLE, ESPACE_GUEST_ROLE}:
                raise HTTPException(
                    status_code=403,
                    detail="Un administrateur direct de l'espace ne peut inviter qu'avec les rôles 'Membre' ou 'Invité'. L'invitation avec le rôle 'Administrateur' est réservée au créateur.",
                )
        else:
            # ✅ Admin par héritage : peut inviter avec tous les rôles
            if invited_role not in {ESPACE_GUEST_ROLE, ESPACE_MEMBER_ROLE, ESPACE_ADMIN_ROLE}:
                raise HTTPException(
                    status_code=403,
                    detail=f"Rôle '{invited_role}' non autorisé pour cette invitation.",
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
    actor_member, _, _, _ = _get_espace_management_grant(
        db,
        espace_id,
        workspace_id,
        current_user_id,
    )
    return actor_member


def _require_espace_delete_access(
    db: Session,
    espace_id: str,
    workspace_id: Optional[str],
    current_user_id: str,
):
    """
    Un administrateur ne peut pas supprimer la ressource racine où commence son périmètre.
    Il peut en revanche supprimer ses descendants.
    """
    actor_member, actor_role, source_type, source_id = _get_espace_management_grant(
        db,
        espace_id,
        workspace_id,
        current_user_id,
    )

    if (
        actor_role == ESPACE_ADMIN_ROLE
        and source_type == "espace"
        and source_id == espace_id
    ):
        espace = _get_espace_or_404(db, espace_id)

        workspace_owner = db.query(Workspace).filter(
            Workspace.id == espace.id_workspace,
            Workspace.id_utilisateur == current_user_id,
        ).first()
        if workspace_owner:
            return Membre(
                role=WORKSPACE_OWNER_ROLE,
                statut="Actif",
                id_utilisateur=current_user_id,
                id_workspace=espace.id_workspace,
            )

        parent_id = espace.id_espace_parent
        while parent_id:
            parent_member = _get_espace_member_record(db, parent_id, current_user_id)
            if (
                parent_member
                and parent_member.statut == "Actif"
                and parent_member.role in ESPACE_MANAGEMENT_ROLES
            ):
                return parent_member

            parent_espace = db.query(Espace).filter(Espace.id == parent_id).first()
            if not parent_espace:
                break
            parent_id = parent_espace.id_espace_parent

        if espace.id_workspace:
            workspace_admin = db.query(Membre).filter(
                Membre.id_workspace == espace.id_workspace,
                Membre.id_utilisateur == current_user_id,
                Membre.role == WORKSPACE_ADMIN_ROLE,
                Membre.statut == "Actif",
            ).first()
            if workspace_admin:
                return workspace_admin

        raise HTTPException(
            status_code=403,
            detail="Un administrateur ne peut pas supprimer l'espace racine de son perimetre.",
        )

    return actor_member


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
    espace = _get_espace_or_404(db, espace_id)
    actor_member, actor_role, actor_source_type, actor_source_id = _get_espace_management_grant(
        db,
        espace_id,
        workspace_id,
        current_user_id,
    )
    target_member = _get_espace_member_record(db, espace_id, target_user_id)
    _validate_espace_member_management_permissions(
        espace,
        actor_role,
        actor_source_type,
        actor_source_id,
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
    espace = _get_espace_or_404(db, espace_id)
    actor_member, actor_role, actor_source_type, actor_source_id = _get_espace_management_grant(
        db,
        espace_id,
        workspace_id or espace.id_workspace,
        current_user_id,
    )
    _validate_espace_invitation_permissions(
        espace_id=espace_id,
        actor_role=actor_role,
        actor_source_type=actor_source_type,
        actor_source_id=actor_source_id,
        invited_role=invited_role,
    )
    return espace, actor_member, actor_role


def _require_espace_owner_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie que l'utilisateur est le créateur de l'espace.

    Retourne un tuple (espace, membre).
    """
    espace = _get_espace_or_404(db, espace_id)
    actor_member, actor_role, _, _ = _get_espace_management_grant(
        db,
        espace_id,
        espace.id_workspace,
        current_user_id,
    )
    if actor_role == ESPACE_OWNER_ROLE:
        return espace, actor_member

    raise HTTPException(
        status_code=403,
        detail="Seul le createur peut effectuer cette action",
    )