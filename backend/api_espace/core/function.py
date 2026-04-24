from datetime import datetime
from typing import Any, Optional
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..models import Espace, PlanerEntreprise, Utilisateur, Workspace

WORKSPACE_MANAGEMENT_ROLES = {"Créateur", "Administrateur"}
ESPACE_MANAGEMENT_ROLES = {"Créateur", "Administrateur"}


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


def _get_workspace_member_or_403(db: Session, workspace_id: str, current_user_id: str):
    from ..crud.utilisateur import get_espace_member as _unused  # noqa – force module init
    from ..models import Membre

    import logging
    import os
    # Utiliser un fichier de log explicite
    debug_log = "/tmp/api_espace_debug.log"
    with open(debug_log, "a") as f:
        f.write(f"DEBUG: Checking WS member. WS: {workspace_id}, User: {current_user_id}\n")

    membre = (
        db.query(Membre)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == current_user_id,
            Membre.statut == "Actif",
        )
        .first()
    )
    
    if not membre:
        # Fallback : vérifier si l'utilisateur est le créateur direct du workspace
        from ..models import Workspace
        ws = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.id_utilisateur == current_user_id).first()
        if ws:
            with open(debug_log, "a") as f:
                f.write(f"DEBUG: Found owner fallback for WS: {workspace_id}, User: {current_user_id}\n")
            # Mock d'un membre pour le rôle Administrateur
            return Membre(id_utilisateur=current_user_id, id_workspace=workspace_id, role="Administrateur", statut="Actif")
            
    if not membre:
        with open(debug_log, "a") as f:
            f.write(f"DEBUG: Membership not found for WS: {workspace_id}, User: {current_user_id}\n")
        raise HTTPException(status_code=403, detail="Acces refuse au workspace")
    return membre


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    membre = _get_workspace_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants sur le workspace")
    return membre


# -----------------------------------------------
# Helpers d'accès — Espace
# -----------------------------------------------

def _get_espace_or_404(db: Session, espace_id: str) -> Espace:
    from ..crud.utilisateur import get_espace_by_id

    espace = get_espace_by_id(db, espace_id)
    if not espace:
        raise HTTPException(status_code=404, detail="Espace non trouve")
    return espace


def _require_espace_access(db: Session, espace_id: str, workspace_id: str, current_user_id: str):
    """Vérifie l'accès à un espace (membre espace OU membre workspace)."""
    from ..crud.utilisateur import get_espace_member

    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member:
        return espace_member
    return _get_workspace_member_or_403(db, workspace_id, current_user_id)


def _require_espace_management_access(db: Session, espace_id: str, workspace_id: str, current_user_id: str):
    """Vérifie l'accès de gestion à un espace (admin/créateur espace OU admin/créateur workspace)."""
    from ..crud.utilisateur import get_espace_member

    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member and espace_member.role in ESPACE_MANAGEMENT_ROLES:
        return espace_member
    return _require_workspace_management_access(db, workspace_id, current_user_id)


def _require_espace_admin_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie que l'utilisateur est administrateur (Créateur ou Administrateur) de l'espace.

    Retourne un tuple (espace, membre).
    Lève une 404 si l'espace n'existe pas,
    une 403 si l'utilisateur n'a pas les droits d'administration.
    """
    from ..crud.utilisateur import get_espace_member

    espace = _get_espace_or_404(db, espace_id)

    # Vérifier d'abord si membre admin/créateur de l'espace
    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member and espace_member.role in ESPACE_MANAGEMENT_ROLES:
        return espace, espace_member

    # Sinon, vérifier si admin/créateur du workspace parent
    if espace.id_workspace:
        try:
            ws_member = _require_workspace_management_access(db, espace.id_workspace, current_user_id)
            return espace, ws_member
        except HTTPException:
            pass

    raise HTTPException(
        status_code=403,
        detail="Acces reserve aux administrateurs de l'espace",
    )


def _require_espace_owner_access(db: Session, espace_id: str, current_user_id: str):
    """Vérifie que l'utilisateur est le créateur de l'espace.

    Retourne un tuple (espace, membre).
    """
    from ..crud.utilisateur import get_espace_member

    espace = _get_espace_or_404(db, espace_id)

    espace_member = get_espace_member(db, espace_id, current_user_id)
    if espace_member and espace_member.role == "Créateur":
        return espace, espace_member

    raise HTTPException(
        status_code=403,
        detail="Seul le createur peut effectuer cette action",
    )
