from datetime import datetime
from typing import Any, Optional
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..models import Espace, PlanerEntreprise, Utilisateur, Workspace

WORKSPACE_MANAGEMENT_ROLES = {"Créateur", "Administrateur"}

def is_premium_user(user: Optional[Utilisateur]) -> bool:
    if not user:
        return False
    if user.type_compte != "Premium":
        return False
    return user.premium_expire_at is not None and user.premium_expire_at > datetime.utcnow()


def is_premium_entreprise(entreprise: Optional[PlanerEntreprise]) -> bool:
    if not entreprise:
        return False
    if not entreprise.is_premium or entreprise.statut_compte != "Actif":
        return False
    return entreprise.premium_expire_at is not None and entreprise.premium_expire_at > datetime.utcnow()


def user_has_premium_workspace_access(db: Session, user_id: str) -> bool:
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if is_premium_user(user):
        return True

    entreprise = db.query(PlanerEntreprise).filter(PlanerEntreprise.id_utilisateur == user_id).first()
    return is_premium_entreprise(entreprise)


def get_workspace_count_for_owner(db: Session, user_id: str) -> int:
    return db.query(Workspace).filter(Workspace.id_utilisateur == user_id).count()


def get_espace_count_for_owner(db: Session, user_id: str) -> int:
    return (
        db.query(Espace)
        .join(Workspace, Espace.id_workspace == Workspace.id)
        .filter(Workspace.id_utilisateur == user_id)
        .count()
    )


def can_create_workspace(db: Session, user_id: str) -> bool:
    if user_has_premium_workspace_access(db, user_id):
        return True
    return get_workspace_count_for_owner(db, user_id) < 1


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

def _serialize_workspace(workspace, membre=None, member_count=None):
    effective_member = membre
    if effective_member is None:
        effective_member = next(
            (
                workspace_member
                for workspace_member in workspace.membres
                if workspace_member.id_utilisateur == workspace.id_utilisateur
            ),
            None,
        )

    resolved_member_count = member_count if member_count is not None else len(workspace.membres or [])

    return {
        "id": workspace.id,
        "nom": workspace.nom,
        "description": workspace.description,
        "created_at": workspace.created_at,
        "updated_at": workspace.updated_at,
        "id_utilisateur": workspace.id_utilisateur,
        "member_count": resolved_member_count,
        "current_user_role": effective_member.role if effective_member else None,
        "current_user_statut": effective_member.statut if effective_member else None,
    }


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


def _get_member_or_403(db: Session, workspace_id: str, current_user_id: str):
    from ..crud.utilisateur import get_member

    membre = get_member(db, workspace_id, current_user_id)
    if not membre:
        raise HTTPException(status_code=403, detail="Acces refuse")
    return membre


def _get_workspace_member_context(db: Session, workspace_id: str, current_user_id: str):
    from ..crud.utilisateur import get_member, get_workspace_by_id

    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    membre = get_member(db, workspace_id, current_user_id)
    if membre:
        return workspace, membre

    if workspace.id_utilisateur == current_user_id:
        return workspace, None

    raise HTTPException(status_code=403, detail="Acces refuse")


def _require_workspace_owner_access(db: Session, workspace_id: str, current_user_id: str):
    from ..crud.utilisateur import get_member, get_workspace_by_id

    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace non trouve")

    if workspace.id_utilisateur != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="Seul le createur peut modifier ce workspace",
        )

    return workspace, get_member(db, workspace_id, current_user_id)


def _require_workspace_management_access(db: Session, workspace_id: str, current_user_id: str):
    membre = _get_member_or_403(db, workspace_id, current_user_id)
    if membre.role not in WORKSPACE_MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Privileges insuffisants")
    return membre
