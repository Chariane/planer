from collections.abc import Iterable
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


RESOURCE_TYPES = {"workspace", "espace", "liste"}


def _validate_resource_type(resource_type: str) -> None:
    if resource_type not in RESOURCE_TYPES:
        raise ValueError(f"Type de ressource messagerie invalide: {resource_type}")


def _prefix(resource_type: str, resource_id: str) -> str:
    _validate_resource_type(resource_type)
    return f"{resource_type}:{resource_id}:"


def _group_name(resource_type: str, resource_id: str, name: Optional[str]) -> str:
    label = (name or f"{resource_type} {resource_id}").strip()[:160]
    return f"{_prefix(resource_type, resource_id)}{label}"


def _get_resource_group_id(db: Session, resource_type: str, resource_id: str) -> Optional[str]:
    row = db.execute(
        text(
            """
            SELECT id
            FROM messagerie.groupe
            WHERE name LIKE :prefix
            ORDER BY created_at ASC
            LIMIT 1
            """
        ),
        {"prefix": f"{_prefix(resource_type, resource_id)}%"},
    ).first()
    return row[0] if row else None


def _add_group_member(db: Session, group_id: str, user_id: Optional[str]) -> None:
    if not user_id:
        return
    db.execute(
        text(
            """
            INSERT INTO messagerie.groupe_members (id_groupe, member)
            VALUES (:group_id, :user_id)
            ON CONFLICT (id_groupe, member) DO NOTHING
            """
        ),
        {"group_id": group_id, "user_id": user_id},
    )


def ensure_resource_group(
    db: Session,
    *,
    resource_type: str,
    resource_id: str,
    name: Optional[str],
    creator_id: Optional[str],
    members: Iterable[str] = (),
) -> Optional[str]:
    group_id = _get_resource_group_id(db, resource_type, resource_id)
    next_name = _group_name(resource_type, resource_id, name)

    if group_id:
        db.execute(
            text(
                """
                UPDATE messagerie.groupe
                SET name = :name
                WHERE id = :group_id
                """
            ),
            {"group_id": group_id, "name": next_name},
        )
    else:
        owner = creator_id or next(iter(members), None)
        if not owner:
            return None
        row = db.execute(
            text(
                """
                INSERT INTO messagerie.groupe (name, creator)
                VALUES (:name, :creator_id)
                RETURNING id
                """
            ),
            {"name": next_name, "creator_id": owner},
        ).first()
        group_id = row[0] if row else None

    if not group_id:
        return None

    _add_group_member(db, group_id, creator_id)
    for member_id in members:
        _add_group_member(db, group_id, member_id)

    return group_id


def sync_resource_member(
    db: Session,
    *,
    resource_type: str,
    resource_id: str,
    user_id: Optional[str],
    name: Optional[str],
    creator_id: Optional[str] = None,
) -> Optional[str]:
    if not user_id:
        return None
    group_id = ensure_resource_group(
        db,
        resource_type=resource_type,
        resource_id=resource_id,
        name=name,
        creator_id=creator_id or user_id,
        members=[user_id],
    )
    return group_id


def remove_resource_member(
    db: Session,
    *,
    resource_type: str,
    resource_id: str,
    user_id: Optional[str],
) -> None:
    if not user_id:
        return
    group_id = _get_resource_group_id(db, resource_type, resource_id)
    if not group_id:
        return
    db.execute(
        text(
            """
            DELETE FROM messagerie.groupe_members
            WHERE id_groupe = :group_id AND member = :user_id
            """
        ),
        {"group_id": group_id, "user_id": user_id},
    )


def delete_resource_group(db: Session, *, resource_type: str, resource_id: str) -> None:
    group_id = _get_resource_group_id(db, resource_type, resource_id)
    if not group_id:
        return
    db.execute(
        text("DELETE FROM messagerie.notification_messagerie WHERE id_groupe = :group_id"),
        {"group_id": group_id},
    )
    db.execute(
        text("DELETE FROM messagerie.message WHERE id_groupe = :group_id"),
        {"group_id": group_id},
    )
    db.execute(
        text("DELETE FROM messagerie.groupe_members WHERE id_groupe = :group_id"),
        {"group_id": group_id},
    )
    db.execute(
        text("DELETE FROM messagerie.groupe WHERE id = :group_id"),
        {"group_id": group_id},
    )
