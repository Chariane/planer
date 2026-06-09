import base64
import json
from datetime import datetime, timedelta
from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, text
from sqlalchemy.orm import Session

from ..models import (
    Espace,
    Groupe,
    GroupeMembers,
    Liste,
    Membre,
    Message,
    NotificationMessagerie,
    Room,
    Utilisateur,
    Workspace,
)
from ..schemas import MessageCreate

RESOURCE_TYPES = {"workspace", "espace", "liste"}
MANAGER_ROLES = {"Créateur", "Administrateur"}
ROLE_RANKS = {"Invité": 1, "Membre": 2, "Administrateur": 3, "Créateur": 4}
MESSAGE_EDIT_WINDOW = timedelta(minutes=30)
LEGACY_ATTACHMENT_META_PREFIX = "__kp_attachment__:"


def _encode_bytes(value: Optional[bytes]) -> Optional[str]:
    if value is None:
        return None
    return base64.b64encode(value).decode("utf-8")


def _encode_photo(value: Optional[bytes]) -> Optional[str]:
    if value is None:
        return None
    return base64.b64encode(value).decode("ascii")


def _decode_payload(value: Optional[str]) -> Optional[bytes]:
    if not value:
        return None
    try:
        return base64.b64decode(value)
    except Exception:
        return value.encode("utf-8")


def _clean_message_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if not cleaned.startswith(LEGACY_ATTACHMENT_META_PREFIX):
        return cleaned

    try:
        meta = json.loads(cleaned[len(LEGACY_ATTACHMENT_META_PREFIX):])
    except Exception:
        return None
    caption = str(meta.get("caption") or "").strip() if isinstance(meta, dict) else ""
    return caption or None


def serialize_message(message: Message) -> dict:
    created_at = message.created_at
    return {
        "id": message.id,
        "sender": message.sender,
        "id_room": message.id_room,
        "id_groupe": message.id_groupe,
        "type": message.type or "text",
        "seen": bool(message.seen),
        "message": message.message,
        "audio": _encode_bytes(message.audio),
        "file": _encode_bytes(message.file),
        "image": _encode_bytes(message.image),
        "video": _encode_bytes(message.video),
        "created_at": created_at,
        "time": created_at.strftime("%d/%m/%Y %H:%M") if created_at else None,
    }


def _get_message_or_404(db: Session, message_id: str) -> Message:
    message = db.query(Message).filter(Message.id == message_id, Message.date_sup.is_(None)).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message introuvable.")
    return message


def _ensure_message_owner(message: Message, user_id: str) -> None:
    if message.sender != user_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres messages.")


def _ensure_message_edit_window(message: Message) -> None:
    if not message.created_at:
        raise HTTPException(status_code=403, detail="Ce message ne peut plus etre modifie.")
    if datetime.utcnow() - message.created_at > MESSAGE_EDIT_WINDOW:
        raise HTTPException(status_code=403, detail="Le delai de modification de 30 minutes est depasse.")


def get_private_message_recipient(db: Session, message: Message, current_user_id: str) -> Optional[str]:
    if message.id_groupe:
        return None

    room = db.query(Room).filter(Room.id == message.id_room).first()
    if not room:
        return None
    if room.member1 == current_user_id:
        return room.member2
    if room.member2 == current_user_id:
        return room.member1
    return None


def update_message_content(db: Session, *, message_id: str, user_id: str, content: str) -> Message:
    message = _get_message_or_404(db, message_id)
    _ensure_message_owner(message, user_id)
    _ensure_message_edit_window(message)
    message.message = _clean_message_text(content)
    message.date_modif = datetime.utcnow()
    db.commit()
    db.refresh(message)
    return message


def delete_message(db: Session, *, message_id: str, user_id: str) -> Message:
    message = _get_message_or_404(db, message_id)
    _ensure_message_owner(message, user_id)
    message.date_sup = datetime.utcnow()
    message.date_modif = datetime.utcnow()
    db.commit()
    db.refresh(message)
    return message


def serialize_group(db: Session, group: Groupe, current_user_id: Optional[str] = None) -> dict:
    member_count = (
        db.query(GroupeMembers)
        .filter(GroupeMembers.id_groupe == group.id)
        .count()
    )
    resource_type, resource_id, display_name = _parse_group_name(group.name)
    can_manage = bool(current_user_id and is_group_admin(db, group, current_user_id))
    is_closed = bool(getattr(group, "is_closed", False))
    return {
        "id": group.id,
        "name": display_name,
        "raw_name": group.name,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "creator": group.creator,
        "member_count": member_count,
        "created_at": group.created_at,
        "is_closed": is_closed,
        "can_manage": can_manage,
        "can_write": (not is_closed) or can_manage,
    }


def _display_user(user: Optional[Utilisateur]) -> dict:
    if not user:
        return {"id": "", "username": "Utilisateur supprimé", "email": None, "photo_base64": None}
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "photo_base64": _encode_photo(user.photo),
    }


def _display_group_name(raw_name: str) -> str:
    return _parse_group_name(raw_name)[2]


def _parse_group_name(raw_name: str) -> tuple[Optional[str], Optional[str], str]:
    parts = raw_name.split(":", 2)
    if len(parts) == 3 and parts[0] in RESOURCE_TYPES:
        return parts[0], parts[1], parts[2]
    return None, None, raw_name


def _resource_group_prefix(resource_type: str, resource_id: str) -> str:
    if resource_type not in RESOURCE_TYPES:
        raise HTTPException(status_code=400, detail="Type de ressource messagerie invalide.")
    return f"{resource_type}:{resource_id}:"


def _resource_group_name(resource_type: str, resource_id: str, name: Optional[str]) -> str:
    label = (name or f"{resource_type} {resource_id}").strip()[:160]
    return f"{_resource_group_prefix(resource_type, resource_id)}{label}"


def _get_resource_name_and_creator(db: Session, resource_type: str, resource_id: str) -> tuple[str, Optional[str]]:
    if resource_type == "workspace":
        workspace = db.query(Workspace).filter(Workspace.id == resource_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace introuvable.")
        return workspace.nom, workspace.id_utilisateur

    if resource_type == "espace":
        espace = db.query(Espace).filter(Espace.id == resource_id).first()
        if not espace:
            raise HTTPException(status_code=404, detail="Espace introuvable.")
        creator = (
            db.query(Membre.id_utilisateur)
            .filter(
                Membre.id_espace == resource_id,
                Membre.role == "Créateur",
                Membre.statut == "Actif",
            )
            .scalar()
        )
        if not creator and espace.id_workspace:
            creator = db.query(Workspace.id_utilisateur).filter(Workspace.id == espace.id_workspace).scalar()
        return espace.nom, creator

    liste = db.query(Liste).filter(Liste.id == resource_id).first()
    if not liste:
        raise HTTPException(status_code=404, detail="Liste introuvable.")
    creator = (
        db.query(Membre.id_utilisateur)
        .filter(
            Membre.id_liste == resource_id,
            Membre.role == "Créateur",
            Membre.statut == "Actif",
        )
        .scalar()
    )
    if not creator and liste.id_workspace:
        creator = db.query(Workspace.id_utilisateur).filter(Workspace.id == liste.id_workspace).scalar()
    if not creator and liste.id_espace:
        espace = db.query(Espace).filter(Espace.id == liste.id_espace).first()
        if espace:
            creator = (
                db.query(Membre.id_utilisateur)
                .filter(
                    Membre.id_espace == espace.id,
                    Membre.role == "Créateur",
                    Membre.statut == "Actif",
                )
                .scalar()
            )
            if not creator and espace.id_workspace:
                creator = db.query(Workspace.id_utilisateur).filter(Workspace.id == espace.id_workspace).scalar()
    return liste.nom, creator


def _has_direct_active_membership(db: Session, user_id: str, **resource_filter: str) -> bool:
    filters = [Membre.id_utilisateur == user_id, Membre.statut == "Actif"]
    for field_name, value in resource_filter.items():
        filters.append(getattr(Membre, field_name) == value)
    return bool(db.query(Membre.id).filter(and_(*filters)).first())


def _highest_role(roles: Iterable[Optional[str]]) -> Optional[str]:
    valid_roles = [role for role in roles if role in ROLE_RANKS]
    if not valid_roles:
        return None
    return max(valid_roles, key=lambda role: ROLE_RANKS[role])


def _get_direct_active_role(db: Session, user_id: str, **resource_filter: str) -> Optional[str]:
    filters = [Membre.id_utilisateur == user_id, Membre.statut == "Actif"]
    for field_name, value in resource_filter.items():
        filters.append(getattr(Membre, field_name) == value)
    roles = [role for (role,) in db.query(Membre.role).filter(and_(*filters)).all()]
    return _highest_role(roles)


def _has_direct_manager_membership(db: Session, user_id: str, **resource_filter: str) -> bool:
    filters = [
        Membre.id_utilisateur == user_id,
        Membre.statut == "Actif",
        Membre.role.in_(MANAGER_ROLES),
    ]
    for field_name, value in resource_filter.items():
        filters.append(getattr(Membre, field_name) == value)
    return bool(db.query(Membre.id).filter(and_(*filters)).first())


def _user_can_access_workspace(db: Session, user_id: str, workspace_id: str) -> bool:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return False
    if workspace.id_utilisateur == user_id:
        return True
    return _has_direct_active_membership(db, user_id, id_workspace=workspace_id)


def _user_can_manage_workspace(db: Session, user_id: str, workspace_id: str) -> bool:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return False
    if workspace.id_utilisateur == user_id:
        return True
    return _has_direct_manager_membership(db, user_id, id_workspace=workspace_id)


def _user_can_access_espace(db: Session, user_id: str, espace_id: str) -> bool:
    espace = db.query(Espace).filter(Espace.id == espace_id).first()
    visited: set[str] = set()

    while espace and espace.id not in visited:
        visited.add(espace.id)
        if _has_direct_active_membership(db, user_id, id_espace=espace.id):
            return True
        if espace.id_workspace and _user_can_access_workspace(db, user_id, espace.id_workspace):
            return True
        if not espace.id_espace_parent:
            break
        espace = db.query(Espace).filter(Espace.id == espace.id_espace_parent).first()

    return False


def _user_can_manage_espace(db: Session, user_id: str, espace_id: str) -> bool:
    espace = db.query(Espace).filter(Espace.id == espace_id).first()
    visited: set[str] = set()

    while espace and espace.id not in visited:
        visited.add(espace.id)
        if _has_direct_manager_membership(db, user_id, id_espace=espace.id):
            return True
        if espace.id_workspace and _user_can_manage_workspace(db, user_id, espace.id_workspace):
            return True
        if not espace.id_espace_parent:
            break
        espace = db.query(Espace).filter(Espace.id == espace.id_espace_parent).first()

    return False


def _user_can_access_liste(db: Session, user_id: str, liste_id: str) -> bool:
    liste = db.query(Liste).filter(Liste.id == liste_id).first()
    if not liste:
        return False
    if _has_direct_active_membership(db, user_id, id_liste=liste_id):
        return True
    if liste.id_workspace:
        return _user_can_access_workspace(db, user_id, liste.id_workspace)
    if liste.id_espace:
        return _user_can_access_espace(db, user_id, liste.id_espace)
    return False


def _user_can_manage_liste(db: Session, user_id: str, liste_id: str) -> bool:
    liste = db.query(Liste).filter(Liste.id == liste_id).first()
    if not liste:
        return False
    if _has_direct_manager_membership(db, user_id, id_liste=liste_id):
        return True
    if liste.id_workspace:
        return _user_can_manage_workspace(db, user_id, liste.id_workspace)
    if liste.id_espace:
        return _user_can_manage_espace(db, user_id, liste.id_espace)
    return False


def _user_effective_workspace_role(db: Session, user_id: str, workspace_id: str) -> Optional[str]:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        return None
    if workspace.id_utilisateur == user_id:
        return "Créateur"
    return _get_direct_active_role(db, user_id, id_workspace=workspace_id)


def _user_effective_espace_role(db: Session, user_id: str, espace_id: str) -> Optional[str]:
    espace = db.query(Espace).filter(Espace.id == espace_id).first()
    visited: set[str] = set()
    roles: list[Optional[str]] = []

    while espace and espace.id not in visited:
        visited.add(espace.id)
        roles.append(_get_direct_active_role(db, user_id, id_espace=espace.id))
        if espace.id_workspace:
            roles.append(_user_effective_workspace_role(db, user_id, espace.id_workspace))
        if not espace.id_espace_parent:
            break
        espace = db.query(Espace).filter(Espace.id == espace.id_espace_parent).first()

    return _highest_role(roles)


def _user_effective_liste_role(db: Session, user_id: str, liste_id: str) -> Optional[str]:
    liste = db.query(Liste).filter(Liste.id == liste_id).first()
    if not liste:
        return None

    roles: list[Optional[str]] = [_get_direct_active_role(db, user_id, id_liste=liste_id)]
    if liste.id_workspace:
        roles.append(_user_effective_workspace_role(db, user_id, liste.id_workspace))
    if liste.id_espace:
        roles.append(_user_effective_espace_role(db, user_id, liste.id_espace))
    return _highest_role(roles)


def _user_effective_resource_role(db: Session, user_id: str, resource_type: str, resource_id: str) -> Optional[str]:
    if resource_type == "workspace":
        return _user_effective_workspace_role(db, user_id, resource_id)
    if resource_type == "espace":
        return _user_effective_espace_role(db, user_id, resource_id)
    if resource_type == "liste":
        return _user_effective_liste_role(db, user_id, resource_id)
    return None


def _user_can_access_resource_group(db: Session, user_id: str, resource_type: str, resource_id: str) -> bool:
    if resource_type == "workspace":
        return _user_can_access_workspace(db, user_id, resource_id)
    if resource_type == "espace":
        return _user_can_access_espace(db, user_id, resource_id)
    if resource_type == "liste":
        return _user_can_access_liste(db, user_id, resource_id)
    return False


def _user_can_write_resource_group(db: Session, user_id: str, resource_type: str, resource_id: str) -> bool:
    return _user_can_access_resource_group(db, user_id, resource_type, resource_id)


def _user_can_manage_resource_group(db: Session, user_id: str, resource_type: str, resource_id: str) -> bool:
    if resource_type == "workspace":
        return _user_can_manage_workspace(db, user_id, resource_id)
    if resource_type == "espace":
        return _user_can_manage_espace(db, user_id, resource_id)
    if resource_type == "liste":
        return _user_can_manage_liste(db, user_id, resource_id)
    return False


def _get_workspace_access_user_ids(db: Session, workspace_id: str) -> list[str]:
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    user_ids = [workspace.id_utilisateur] if workspace and workspace.id_utilisateur else []
    member_ids = (
        db.query(Membre.id_utilisateur)
        .filter(
            Membre.id_workspace == workspace_id,
            Membre.statut == "Actif",
            Membre.id_utilisateur.isnot(None),
        )
        .all()
    )
    user_ids.extend(member_id for (member_id,) in member_ids if member_id)
    return list(dict.fromkeys(user_ids))


def _get_espace_ancestor_ids(db: Session, espace: Espace) -> list[str]:
    ancestor_ids: list[str] = []
    current_parent_id = espace.id_espace_parent
    seen: set[str] = {espace.id}
    while current_parent_id and current_parent_id not in seen:
        seen.add(current_parent_id)
        ancestor_ids.append(current_parent_id)
        parent = db.query(Espace).filter(Espace.id == current_parent_id).first()
        current_parent_id = parent.id_espace_parent if parent else None
    return ancestor_ids


def _get_espace_access_user_ids(db: Session, espace_id: str) -> list[str]:
    espace = db.query(Espace).filter(Espace.id == espace_id).first()
    if not espace:
        return []

    user_ids = _get_workspace_access_user_ids(db, espace.id_workspace) if espace.id_workspace else []
    espace_ids = [espace.id, *_get_espace_ancestor_ids(db, espace)]
    member_ids = (
        db.query(Membre.id_utilisateur)
        .filter(
            Membre.id_espace.in_(espace_ids),
            Membre.statut == "Actif",
            Membre.id_utilisateur.isnot(None),
        )
        .all()
    )
    user_ids.extend(member_id for (member_id,) in member_ids if member_id)
    return list(dict.fromkeys(user_ids))


def _get_liste_access_user_ids(db: Session, liste_id: str) -> list[str]:
    liste = db.query(Liste).filter(Liste.id == liste_id).first()
    if not liste:
        return []

    user_ids: list[str] = []
    if liste.id_workspace:
        user_ids.extend(_get_workspace_access_user_ids(db, liste.id_workspace))
    if liste.id_espace:
        user_ids.extend(_get_espace_access_user_ids(db, liste.id_espace))

    member_ids = (
        db.query(Membre.id_utilisateur)
        .filter(
            Membre.id_liste == liste_id,
            Membre.statut == "Actif",
            Membre.id_utilisateur.isnot(None),
        )
        .all()
    )
    user_ids.extend(member_id for (member_id,) in member_ids if member_id)
    return list(dict.fromkeys(user_ids))


def _get_resource_access_user_ids(db: Session, resource_type: str, resource_id: str) -> list[str]:
    if resource_type == "workspace":
        return _get_workspace_access_user_ids(db, resource_id)
    if resource_type == "espace":
        return _get_espace_access_user_ids(db, resource_id)
    if resource_type == "liste":
        return _get_liste_access_user_ids(db, resource_id)
    return []


def _sync_resource_group_access_members(db: Session, group: Groupe) -> None:
    resource_type, resource_id, _ = _parse_group_name(group.name)
    if not resource_type or not resource_id:
        return

    user_ids = _get_resource_access_user_ids(db, resource_type, resource_id)
    for user_id in user_ids:
        add_group_member(db, group.id, user_id, commit=False)
    db.commit()


def _get_espace_with_descendants(db: Session, espace: Espace) -> list[Espace]:
    if espace.id_workspace:
        candidates = db.query(Espace).filter(Espace.id_workspace == espace.id_workspace).all()
    else:
        candidates = db.query(Espace).all()

    children_by_parent: dict[Optional[str], list[Espace]] = {}
    for candidate in candidates:
        children_by_parent.setdefault(candidate.id_espace_parent, []).append(candidate)

    result: list[Espace] = []
    queue = [espace]
    seen: set[str] = set()
    while queue:
        current = queue.pop(0)
        if current.id in seen:
            continue
        seen.add(current.id)
        result.append(current)
        queue.extend(children_by_parent.get(current.id, []))
    return result


def _ensure_workspace_discussions_for_user(
    db: Session,
    *,
    workspace: Workspace,
    user_id: str,
    ensured: set[tuple[str, str]],
) -> None:
    _ensure_resource_discussion_for_user(
        db,
        resource_type="workspace",
        resource_id=workspace.id,
        name=workspace.nom,
        creator_id=workspace.id_utilisateur,
        user_id=user_id,
        ensured=ensured,
    )

    espaces = db.query(Espace).filter(Espace.id_workspace == workspace.id).all()
    for espace in espaces:
        _ensure_resource_discussion_for_user(
            db,
            resource_type="espace",
            resource_id=espace.id,
            name=espace.nom,
            creator_id=None,
            user_id=user_id,
            ensured=ensured,
        )

    workspace_listes = db.query(Liste).filter(Liste.id_workspace == workspace.id).all()
    espace_ids = [espace.id for espace in espaces]
    espace_listes = db.query(Liste).filter(Liste.id_espace.in_(espace_ids)).all() if espace_ids else []
    for liste in [*workspace_listes, *espace_listes]:
        _ensure_resource_discussion_for_user(
            db,
            resource_type="liste",
            resource_id=liste.id,
            name=liste.nom,
            creator_id=None,
            user_id=user_id,
            ensured=ensured,
        )


def _ensure_espace_discussions_for_user(
    db: Session,
    *,
    espace: Espace,
    user_id: str,
    ensured: set[tuple[str, str]],
) -> None:
    espaces = _get_espace_with_descendants(db, espace)
    for current_espace in espaces:
        _ensure_resource_discussion_for_user(
            db,
            resource_type="espace",
            resource_id=current_espace.id,
            name=current_espace.nom,
            creator_id=None,
            user_id=user_id,
            ensured=ensured,
        )

    espace_ids = [current_espace.id for current_espace in espaces]
    listes = db.query(Liste).filter(Liste.id_espace.in_(espace_ids)).all() if espace_ids else []
    for liste in listes:
        _ensure_resource_discussion_for_user(
            db,
            resource_type="liste",
            resource_id=liste.id,
            name=liste.nom,
            creator_id=None,
            user_id=user_id,
            ensured=ensured,
        )


def _ensure_resource_discussion_for_user(
    db: Session,
    *,
    resource_type: str,
    resource_id: str,
    name: str,
    creator_id: Optional[str],
    user_id: str,
    ensured: set[tuple[str, str]],
) -> None:
    key = (resource_type, resource_id)
    if key in ensured:
        return
    ensured.add(key)
    ensure_resource_group(
        db,
        resource_type=resource_type,
        resource_id=resource_id,
        name=name,
        creator_id=creator_id,
        members=[user_id],
    )


def get_or_create_private_room(db: Session, user1_id: str, user2_id: str) -> Room:
    member1, member2 = sorted([user1_id, user2_id])
    room = (
        db.query(Room)
        .filter(Room.member1 == member1, Room.member2 == member2)
        .first()
    )
    if room:
        return room

    room = Room(member1=member1, member2=member2)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def get_or_create_group_room(db: Session, group_id: str) -> Room:
    technical_member = f"group:{group_id}"
    room = (
        db.query(Room)
        .filter(Room.member1 == technical_member, Room.member2 == technical_member)
        .first()
    )
    if room:
        return room

    room = Room(member1=technical_member, member2=technical_member)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def create_private_message(
    db: Session,
    *,
    sender_id: str,
    receiver_id: str,
    payload: MessageCreate,
) -> Message:
    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous écrire à vous-même.")

    receiver = db.query(Utilisateur).filter(Utilisateur.id == receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Destinataire introuvable.")

    room = get_or_create_private_room(db, sender_id, receiver_id)
    message = Message(
        sender=sender_id,
        id_room=room.id,
        id_groupe=None,
        type=payload.type or "text",
        message=_clean_message_text(payload.message),
        audio=_decode_payload(payload.audio),
        file=_decode_payload(payload.file),
        image=_decode_payload(payload.image),
        video=_decode_payload(payload.video),
        seen=False,
    )
    db.add(message)
    db.flush()
    db.add(NotificationMessagerie(id_utilisateur=receiver_id, type="private_message"))
    db.commit()
    db.refresh(message)
    return message


def get_private_messages(db: Session, *, current_user_id: str, other_user_id: str) -> list[dict]:
    room = get_or_create_private_room(db, current_user_id, other_user_id)
    mark_private_notifications_as_read(db, user_id=current_user_id)
    (
        db.query(Message)
        .filter(
            Message.id_room == room.id,
            Message.id_groupe.is_(None),
            Message.sender == other_user_id,
            or_(Message.seen.is_(False), Message.seen.is_(None)),
        )
        .update({Message.seen: True}, synchronize_session=False)
    )
    db.commit()
    messages = (
        db.query(Message)
        .filter(Message.id_room == room.id, Message.id_groupe.is_(None), Message.date_sup.is_(None))
        .order_by(Message.created_at.asc())
        .all()
    )
    return [serialize_message(message) for message in messages]


def list_private_conversations(db: Session, *, current_user_id: str) -> list[dict]:
    rooms = (
        db.query(Room)
        .filter(
            or_(Room.member1 == current_user_id, Room.member2 == current_user_id),
            ~Room.member1.like("group:%"),
            ~Room.member2.like("group:%"),
        )
        .all()
    )

    conversations = []
    for room in rooms:
        other_user_id = room.member2 if room.member1 == current_user_id else room.member1
        other_user = db.query(Utilisateur).filter(Utilisateur.id == other_user_id).first()
        last_message = (
            db.query(Message)
            .filter(Message.id_room == room.id, Message.id_groupe.is_(None), Message.date_sup.is_(None))
            .order_by(Message.created_at.desc())
            .first()
        )
        conversations.append({
            "room_id": room.id,
            "user": _display_user(other_user),
            "last_message": serialize_message(last_message) if last_message else None,
            "updated_at": last_message.created_at if last_message else room.created_at,
        })

    return sorted(
        conversations,
        key=lambda conversation: conversation.get("updated_at") or datetime.min,
        reverse=True,
    )


def mark_private_notifications_as_read(db: Session, *, user_id: str) -> None:
    unread_notifications = (
        db.query(NotificationMessagerie)
        .filter(
            NotificationMessagerie.id_utilisateur == user_id,
            NotificationMessagerie.id_groupe.is_(None),
            NotificationMessagerie.type == "private_message",
            or_(NotificationMessagerie.est_lu.is_(False), NotificationMessagerie.est_lu.is_(None)),
        )
        .all()
    )
    if not unread_notifications:
        return
    for notification in unread_notifications:
        notification.est_lu = True
    db.commit()


def create_group(
    db: Session,
    *,
    name: str,
    creator_id: str,
    members: Iterable[str],
) -> Groupe:
    group = Groupe(name=name.strip(), creator=creator_id)
    db.add(group)
    db.flush()
    add_group_member(db, group.id, creator_id, commit=False)
    for member_id in members:
        add_group_member(db, group.id, member_id, commit=False)
    db.commit()
    db.refresh(group)
    return group


def list_user_groups(db: Session, user_id: str) -> list[dict]:
    ensure_user_resource_groups(db, user_id)
    groups = (
        db.query(Groupe)
        .join(GroupeMembers, GroupeMembers.id_groupe == Groupe.id)
        .filter(GroupeMembers.member == user_id)
        .order_by(Groupe.created_at.desc())
        .all()
    )
    unique_groups: list[Groupe] = []
    seen_resources: set[tuple[str, str]] = set()

    for group in groups:
        resource_type, resource_id, _ = _parse_group_name(group.name)
        if resource_type and resource_id and not _user_can_access_resource_group(db, user_id, resource_type, resource_id):
            continue
        key = (resource_type, resource_id) if resource_type and resource_id else ("group", group.id)
        if key in seen_resources:
            continue
        seen_resources.add(key)
        unique_groups.append(group)

    return [serialize_group(db, group, current_user_id=user_id) for group in unique_groups]


def ensure_user_resource_groups(db: Session, user_id: str) -> None:
    ensured: set[tuple[str, str]] = set()

    owned_workspaces = db.query(Workspace).filter(Workspace.id_utilisateur == user_id).all()
    for workspace in owned_workspaces:
        _ensure_workspace_discussions_for_user(db, workspace=workspace, user_id=user_id, ensured=ensured)

    memberships = (
        db.query(Membre)
        .filter(Membre.id_utilisateur == user_id, Membre.statut == "Actif")
        .all()
    )

    for membership in memberships:
        if membership.id_workspace:
            workspace = db.query(Workspace).filter(Workspace.id == membership.id_workspace).first()
            if workspace:
                _ensure_workspace_discussions_for_user(db, workspace=workspace, user_id=user_id, ensured=ensured)
        elif membership.id_espace:
            espace = db.query(Espace).filter(Espace.id == membership.id_espace).first()
            if espace:
                _ensure_espace_discussions_for_user(db, espace=espace, user_id=user_id, ensured=ensured)
        elif membership.id_liste:
            liste = db.query(Liste).filter(Liste.id == membership.id_liste).first()
            if liste:
                _ensure_resource_discussion_for_user(
                    db,
                    resource_type="liste",
                    resource_id=liste.id,
                    name=liste.nom,
                    creator_id=None,
                    user_id=user_id,
                    ensured=ensured,
                )


def require_group_member(db: Session, group_id: str, user_id: str) -> GroupeMembers:
    group = get_group_or_404(db, group_id)
    resource_type, resource_id, _ = _parse_group_name(group.name)
    membership = (
        db.query(GroupeMembers)
        .filter(GroupeMembers.id_groupe == group_id, GroupeMembers.member == user_id)
        .first()
    )
    if resource_type and resource_id:
        if not _user_can_access_resource_group(db, user_id, resource_type, resource_id):
            raise HTTPException(status_code=403, detail="Accès refusé à ce groupe.")
        if membership:
            return membership
        membership = add_group_member(db, group_id, user_id)
        if membership:
            return membership

    if not membership:
        raise HTTPException(status_code=403, detail="Accès refusé à ce groupe.")
    return membership


def ensure_group_write_access(db: Session, group_id: str, user_id: str) -> Groupe:
    group = get_group_or_404(db, group_id)
    require_group_member(db, group_id, user_id)
    if bool(getattr(group, "is_closed", False)) and not is_group_admin(db, group, user_id):
        raise HTTPException(
            status_code=403,
            detail="Cette discussion est fermée par les administrateurs. Vous pouvez la lire, mais vous ne pouvez pas écrire ni lancer d'appel.",
        )
    return group


def set_group_closed(db: Session, *, group_id: str, user_id: str, is_closed: bool) -> Groupe:
    group = get_group_or_404(db, group_id)
    require_group_member(db, group_id, user_id)
    if not is_group_admin(db, group, user_id):
        raise HTTPException(status_code=403, detail="Seuls les administrateurs du groupe peuvent ouvrir ou fermer cette discussion.")
    group.is_closed = is_closed
    db.commit()
    db.refresh(group)
    return group


def get_group_or_404(db: Session, group_id: str) -> Groupe:
    group = db.query(Groupe).filter(Groupe.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Groupe introuvable.")
    return group


def add_group_member(db: Session, group_id: str, user_id: str, *, commit: bool = True) -> GroupeMembers:
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    db.flush()
    membership = (
        db.query(GroupeMembers)
        .filter(GroupeMembers.id_groupe == group_id, GroupeMembers.member == user_id)
        .first()
    )
    if membership:
        return membership

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
    if commit:
        db.commit()
    membership = (
        db.query(GroupeMembers)
        .filter(GroupeMembers.id_groupe == group_id, GroupeMembers.member == user_id)
        .first()
    )
    return membership


def remove_group_member(db: Session, group_id: str, user_id: str) -> None:
    membership = (
        db.query(GroupeMembers)
        .filter(GroupeMembers.id_groupe == group_id, GroupeMembers.member == user_id)
        .first()
    )
    if membership:
        db.delete(membership)
        db.commit()


def get_group_members(db: Session, group_id: str, current_user_id: str) -> list[dict]:
    require_group_member(db, group_id, current_user_id)
    group = get_group_or_404(db, group_id)
    _sync_resource_group_access_members(db, group)
    resource_type, resource_id, _ = _parse_group_name(group.name)
    rows = (
        db.query(GroupeMembers, Utilisateur)
        .outerjoin(Utilisateur, Utilisateur.id == GroupeMembers.member)
        .filter(GroupeMembers.id_groupe == group_id)
        .order_by(GroupeMembers.member.asc())
        .all()
    )
    return [
        {
            **_display_user(user),
            "role": "Administrateur" if user and is_group_admin(db, group, user.id) else "Membre",
        }
        for _membership, user in rows
        if not resource_type
        or not resource_id
        or (user and _user_can_access_resource_group(db, user.id, resource_type, resource_id))
    ]


def create_group_message(
    db: Session,
    *,
    group_id: str,
    sender_id: str,
    payload: MessageCreate,
) -> Message:
    group = ensure_group_write_access(db, group_id, sender_id)
    _sync_resource_group_access_members(db, group)
    room = get_or_create_group_room(db, group_id)
    message = Message(
        sender=sender_id,
        id_room=room.id,
        id_groupe=group_id,
        type=payload.type or "text",
        message=_clean_message_text(payload.message),
        audio=_decode_payload(payload.audio),
        file=_decode_payload(payload.file),
        image=_decode_payload(payload.image),
        video=_decode_payload(payload.video),
        seen=False,
    )
    db.add(message)
    db.flush()

    resource_type, resource_id, _ = _parse_group_name(group.name)
    member_ids = [
        row.member
        for row in db.query(GroupeMembers).filter(GroupeMembers.id_groupe == group_id).all()
        if row.member != sender_id
        and (
            not resource_type
            or not resource_id
            or _user_can_access_resource_group(db, row.member, resource_type, resource_id)
        )
    ]
    for member_id in member_ids:
        db.add(NotificationMessagerie(id_utilisateur=member_id, id_groupe=group.id, type="group_message"))
    db.commit()
    db.refresh(message)
    return message


def get_group_messages(db: Session, *, group_id: str, current_user_id: str) -> list[dict]:
    require_group_member(db, group_id, current_user_id)
    mark_group_notifications_as_read(db, group_id=group_id, user_id=current_user_id)
    messages = (
        db.query(Message)
        .filter(Message.id_groupe == group_id, Message.date_sup.is_(None))
        .order_by(Message.created_at.asc())
        .all()
    )
    return [serialize_message(message) for message in messages]


def mark_group_notifications_as_read(db: Session, *, group_id: str, user_id: str) -> None:
    unread_notifications = (
        db.query(NotificationMessagerie)
        .filter(
            NotificationMessagerie.id_utilisateur == user_id,
            NotificationMessagerie.id_groupe == group_id,
            or_(NotificationMessagerie.est_lu.is_(False), NotificationMessagerie.est_lu.is_(None)),
        )
        .all()
    )
    if not unread_notifications:
        return
    for notification in unread_notifications:
        notification.est_lu = True
    db.commit()


def get_unread_summary(db: Session, *, user_id: str) -> dict:
    unread_group_counts = {
        group_id: count
        for group_id, count in (
            db.query(NotificationMessagerie.id_groupe, func.count(NotificationMessagerie.id))
            .filter(
                NotificationMessagerie.id_utilisateur == user_id,
                or_(NotificationMessagerie.est_lu.is_(False), NotificationMessagerie.est_lu.is_(None)),
                NotificationMessagerie.id_groupe.isnot(None),
            )
            .group_by(NotificationMessagerie.id_groupe)
            .all()
        )
        if group_id
    }
    unread_private_counts = {}
    private_rows = (
        db.query(Room, Message.sender, func.count(Message.id))
        .join(Message, Message.id_room == Room.id)
        .filter(
            or_(Room.member1 == user_id, Room.member2 == user_id),
            ~Room.member1.like("group:%"),
            ~Room.member2.like("group:%"),
            Message.id_groupe.is_(None),
            Message.sender != user_id,
            or_(Message.seen.is_(False), Message.seen.is_(None)),
            Message.date_sup.is_(None),
        )
        .group_by(Room.id, Message.sender)
        .all()
    )
    for room, sender_id, count in private_rows:
        other_user_id = room.member2 if room.member1 == user_id else room.member1
        if sender_id == other_user_id:
            unread_private_counts[other_user_id] = int(count)

    unread_group_ids = list(unread_group_counts.keys())
    unread_private_user_ids = list(unread_private_counts.keys())
    return {
        "unread_discussions_count": len(unread_group_ids) + len(unread_private_user_ids),
        "unread_group_ids": unread_group_ids,
        "unread_group_counts": unread_group_counts,
        "unread_private_user_ids": unread_private_user_ids,
        "unread_private_counts": unread_private_counts,
        "has_private_unread": len(unread_private_user_ids) > 0,
    }


def get_resource_group(db: Session, resource_type: str, resource_id: str) -> Optional[Groupe]:
    prefix = _resource_group_prefix(resource_type, resource_id)
    return db.query(Groupe).filter(Groupe.name.like(f"{prefix}%")).first()


def ensure_resource_group(
    db: Session,
    *,
    resource_type: str,
    resource_id: str,
    name: Optional[str] = None,
    creator_id: Optional[str] = None,
    members: Iterable[str] = (),
) -> Groupe:
    group = get_resource_group(db, resource_type, resource_id)
    resource_name, resource_creator_id = _get_resource_name_and_creator(db, resource_type, resource_id)
    resolved_creator = creator_id or resource_creator_id
    if not resolved_creator:
        raise HTTPException(status_code=400, detail="Créateur de groupe introuvable.")

    desired_name = _resource_group_name(resource_type, resource_id, name or resource_name)
    if not group:
        group = Groupe(name=desired_name, creator=resolved_creator)
        db.add(group)
        db.flush()
    else:
        group.name = desired_name
        group.creator = group.creator or resolved_creator

    member_ids = list(dict.fromkeys([resolved_creator, *members]))
    for member_id in member_ids:
        add_group_member(db, group.id, member_id, commit=False)
    db.commit()
    db.refresh(group)
    return group


def sync_resource_member(
    db: Session,
    *,
    resource_type: str,
    resource_id: str,
    user_id: str,
    name: Optional[str] = None,
    creator_id: Optional[str] = None,
) -> Groupe:
    group = ensure_resource_group(
        db,
        resource_type=resource_type,
        resource_id=resource_id,
        name=name,
        creator_id=creator_id,
    )
    add_group_member(db, group.id, user_id)
    db.refresh(group)
    return group


def remove_resource_member(db: Session, *, resource_type: str, resource_id: str, user_id: str) -> None:
    group = get_resource_group(db, resource_type, resource_id)
    if not group:
        return
    remove_group_member(db, group.id, user_id)


def is_group_admin(db: Session, group: Groupe, user_id: str) -> bool:
    if group.creator == user_id:
        return True

    resource_type, resource_id, _ = _parse_group_name(group.name)
    if not resource_type or not resource_id:
        return False

    return _user_can_manage_resource_group(db, user_id, resource_type, resource_id)
