from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session, joinedload

from ..core.function import (
    ResourceType,
    _extract_file_target,
    _get_direct_target_membership,
    _get_fichier_or_404,
    _is_resource_within_scope,
    _require_attachment_target_read_access,
    _require_attachment_target_write_access,
    _require_attachment_target_management_access,
    _require_file_management_access,
    _require_file_read_access,
    _resolve_file_target_context,
    commit_or_raise,
)
from ..core.security import ALGORITHM, SECRET_KEY, create_access_token
from ..models import Fichier, Membre, Utilisateur


FILE_TARGET_TYPES = {
    ResourceType.WORKSPACE,
    ResourceType.ESPACE,
    ResourceType.LISTE,
    ResourceType.TACHE,
    ResourceType.CANEVAS,
    ResourceType.SECTION,
    ResourceType.CHECKLIST,
}

FILE_METADATA_RESERVED_KEYS = {
    "target_type",
    "target_id",
    "anchor_type",
    "anchor_id",
    "owner_user_id",
    "uploaded_at",
}


def get_file_by_id(db: Session, file_id: str) -> Optional[Fichier]:
    return db.query(Fichier).filter(Fichier.id == file_id).first()


def _build_file_metadata(
    *,
    base_meta: Optional[dict[str, Any]],
    target_context: dict[str, Any],
    owner_user_id: str,
) -> dict[str, Any]:
    metadata = dict(base_meta or {})
    metadata.update(
        {
            "target_type": target_context["target_type"],
            "target_id": target_context["target_id"],
            "anchor_type": target_context["anchor_type"],
            "anchor_id": target_context["anchor_id"],
            "owner_user_id": owner_user_id,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return metadata


def create_file_attachment(
    db: Session,
    *,
    current_user_id: str,
    nom: str,
    url_fichier: Optional[str],
    type_fichier: Optional[str],
    meta_donnees: Optional[dict[str, Any]],
    target_type: str,
    target_id: str,
) -> Fichier:
    if target_type not in FILE_TARGET_TYPES:
        raise HTTPException(status_code=400, detail="Type de cible de fichier invalide.")

    target_context = _resolve_file_target_context(db, target_type, target_id)
    _require_attachment_target_write_access(db, target_type, target_id, current_user_id)

    direct_membership = _get_direct_target_membership(
        db,
        current_user_id,
        target_context["anchor_type"],
        target_context["anchor_id"],
    )

    fichier = Fichier(
        nom=nom,
        url_fichier=url_fichier,
        type_fichier=type_fichier,
        meta_donnees=_build_file_metadata(
            base_meta=meta_donnees,
            target_context=target_context,
            owner_user_id=current_user_id,
        ),
        id_membre=direct_membership.id if direct_membership else None,
    )
    db.add(fichier)
    commit_or_raise(
        db,
        detail="Impossible de rattacher ce fichier a la ressource cible.",
        refresh_instance=fichier,
    )
    return fichier


def list_accessible_files(
    db: Session,
    *,
    current_user_id: str,
    q: Optional[str] = None,
    type_fichier: Optional[str] = None,
    scope_type: Optional[str] = None,
    scope_id: Optional[str] = None,
    member_id: Optional[str] = None,
    limit: int = 50,
) -> list[Fichier]:
    query = db.query(Fichier)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(Fichier.nom.ilike(pattern))
    if type_fichier:
        query = query.filter(Fichier.type_fichier == type_fichier)
    if member_id:
        query = query.filter(Fichier.id_membre == member_id)

    candidates = (
        query.options(joinedload(Fichier.membres).joinedload(Membre.utilisateur))
        .order_by(Fichier.created_at.desc())
        .limit(max(limit, 1) * 8)
        .all()
    )

    results: list[Fichier] = []
    for fichier in candidates:
        target_type, target_id = _extract_file_target(fichier)
        if not target_type or not target_id:
            continue

        if scope_type and scope_id:
            if not _is_resource_within_scope(
                db,
                target_type=target_type,
                target_id=target_id,
                scope_type=scope_type,
                scope_id=scope_id,
            ):
                continue

        try:
            _require_file_read_access(db, fichier.id, current_user_id)
        except HTTPException:
            continue

        owner_user_id = (fichier.meta_donnees or {}).get("owner_user_id")
        owner_name = "inconnu"
        
        # Résolution du nom via id_membre ou owner_user_id
        if fichier.membres and fichier.membres.utilisateur:
            owner_name = f"{fichier.membres.utilisateur.nom or ''} {fichier.membres.utilisateur.prenoms or ''}".strip() or fichier.membres.utilisateur.username
        elif owner_user_id:
            user = db.query(Utilisateur).filter(Utilisateur.id == owner_user_id).first()
            if user:
                owner_name = f"{user.nom or ''} {user.prenoms or ''}".strip() or user.username
        
        # On attache le nom à l'objet pour le schéma Pydantic
        setattr(fichier, 'owner_name', owner_name)
        
        results.append(fichier)
        if len(results) >= limit:
            break

    return results


def update_file_attachment(
    db: Session,
    *,
    file_id: str,
    current_user_id: str,
    nom: Optional[str] = None,
    url_fichier: Optional[str] = None,
    type_fichier: Optional[str] = None,
    meta_donnees: Optional[dict[str, Any]] = None,
) -> Fichier:
    fichier = _require_file_management_access(db, file_id, current_user_id)

    if nom is not None:
        fichier.nom = nom
    if url_fichier is not None:
        fichier.url_fichier = url_fichier
    if type_fichier is not None:
        fichier.type_fichier = type_fichier
    if meta_donnees is not None:
        preserved = {
            key: value
            for key, value in (fichier.meta_donnees or {}).items()
            if key in FILE_METADATA_RESERVED_KEYS
        }
        merged_meta = dict(meta_donnees)
        merged_meta.update(preserved)
        fichier.meta_donnees = merged_meta

    commit_or_raise(
        db,
        detail="Impossible de mettre a jour ce fichier.",
        refresh_instance=fichier,
    )
    return fichier


def delete_file_attachment(db: Session, *, file_id: str, current_user_id: str) -> None:
    fichier = _get_fichier_or_404(db, file_id)
    target_type, target_id = _extract_file_target(fichier)

    is_owner = False
    owner_user_id = (fichier.meta_donnees or {}).get("owner_user_id")
    if owner_user_id == current_user_id:
        is_owner = True
    elif fichier.membres and fichier.membres.id_utilisateur == current_user_id:
        is_owner = True

    if not is_owner:
        if not target_type or not target_id:
            raise HTTPException(status_code=403, detail="Ce fichier n'est pas correctement rattache a une ressource.")
        _require_attachment_target_management_access(db, target_type, target_id, current_user_id)

    db.delete(fichier)
    commit_or_raise(db, detail="Impossible de supprimer ce fichier.")


def create_file_share_token(
    db: Session,
    *,
    file_id: str,
    current_user_id: str,
    expires_in_hours: int = 24,
    allow_download: bool = True,
) -> dict[str, Any]:
    fichier = _require_file_management_access(db, file_id, current_user_id)
    expires_delta = timedelta(hours=expires_in_hours)
    expires_at = datetime.now(timezone.utc) + expires_delta
    token = create_access_token(
        data={
            "type": "file_share",
            "file_id": fichier.id,
            "allow_download": allow_download,
        },
        expires_delta=expires_delta,
    )
    return {
        "token": token,
        "expires_at": expires_at,
        "file_id": fichier.id,
        "allow_download": allow_download,
    }


def resolve_file_share_token(db: Session, token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=400, detail="Lien de partage invalide ou expire.") from exc

    if payload.get("type") != "file_share":
        raise HTTPException(status_code=403, detail="Type de token invalide pour ce partage.")

    file_id = payload.get("file_id")
    if not file_id:
        raise HTTPException(status_code=400, detail="ID du fichier absent du token.")

    fichier = _get_fichier_or_404(db, file_id)
    return {
        "file": {
            "id": fichier.id,
            "nom": fichier.nom,
            "url_fichier": fichier.url_fichier,
            "type_fichier": fichier.type_fichier,
            "meta_donnees": fichier.meta_donnees,
            "created_at": fichier.created_at,
            "id_membre": fichier.id_membre,
        },
        "allow_download": bool(payload.get("allow_download", True)),
    }
