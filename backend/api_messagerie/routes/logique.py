import base64
from datetime import datetime
from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, or_
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


def _encode_bytes(value: Optional[bytes]) -> Optional[str]:
    if value is None:
        return None
    return base64.b64encode(value).decode("utf-8")


def _decode_payload(value: Optional[str]) -> Optional[bytes]:
    if not value:
        return None
    try:
        return base64.b64decode(value)
    except Exception:
        return value.encode("utf-8")


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


def serialize_group(db: Session, group: Groupe) -> dict:
    member_count = (
        db.query(GroupeMembers)
        .filter(GroupeMembers.id_groupe == group.id)
        .count()
    )
    return {
        "id": group.id,
        "name": _display_group_name(group.name),
        "creator": group.creator,
        "member_count": member_count,
        "created_at": group.created_at,
    }


def _display_user(user: Optional[Utilisateur]) -> dict:
    if not user:
        return {"id": "", "username": "Utilisateur supprimé", "email": None}
    return {"id": user.id, "username": user.username, "email": user.email}


def _display_group_name(raw_name: str) -> str:
    parts = raw_name.split(":", 2)
    if len(parts) == 3 and parts[0] in RESOURCE_TYPES:
        return parts[2]
    return raw_name


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
    return liste.nom, creator


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
        message=payload.message,
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
    messages = (
        db.query(Message)
        .filter(Message.id_room == room.id, Message.id_groupe.is_(None), Message.date_sup.is_(None))
        .order_by(Message.created_at.asc())
        .all()
    )
    return [serialize_message(message) for message in messages]


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
    groups = (
        db.query(Groupe)
        .join(GroupeMembers, GroupeMembers.id_groupe == Groupe.id)
        .filter(GroupeMembers.member == user_id)
        .order_by(Groupe.created_at.desc())
        .all()
    )
    return [serialize_group(db, group) for group in groups]


def require_group_member(db: Session, group_id: str, user_id: str) -> GroupeMembers:
    membership = (
        db.query(GroupeMembers)
        .filter(GroupeMembers.id_groupe == group_id, GroupeMembers.member == user_id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Accès refusé à ce groupe.")
    return membership


def get_group_or_404(db: Session, group_id: str) -> Groupe:
    group = db.query(Groupe).filter(Groupe.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Groupe introuvable.")
    return group


def add_group_member(db: Session, group_id: str, user_id: str, *, commit: bool = True) -> GroupeMembers:
    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    membership = (
        db.query(GroupeMembers)
        .filter(GroupeMembers.id_groupe == group_id, GroupeMembers.member == user_id)
        .first()
    )
    if membership:
        return membership

    membership = GroupeMembers(id_groupe=group_id, member=user_id)
    db.add(membership)
    if commit:
        db.commit()
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
    rows = (
        db.query(GroupeMembers, Utilisateur)
        .outerjoin(Utilisateur, Utilisateur.id == GroupeMembers.member)
        .filter(GroupeMembers.id_groupe == group_id)
        .order_by(GroupeMembers.member.asc())
        .all()
    )
    group = get_group_or_404(db, group_id)
    return [
        {
            **_display_user(user),
            "role": "Administrateur" if user and is_group_admin(db, group, user.id) else "Membre",
        }
        for _membership, user in rows
    ]


def create_group_message(
    db: Session,
    *,
    group_id: str,
    sender_id: str,
    payload: MessageCreate,
) -> Message:
    group = get_group_or_404(db, group_id)
    require_group_member(db, group_id, sender_id)
    room = get_or_create_group_room(db, group_id)
    message = Message(
        sender=sender_id,
        id_room=room.id,
        id_groupe=group_id,
        type=payload.type or "text",
        message=payload.message,
        audio=_decode_payload(payload.audio),
        file=_decode_payload(payload.file),
        image=_decode_payload(payload.image),
        video=_decode_payload(payload.video),
        seen=False,
    )
    db.add(message)
    db.flush()

    member_ids = [
        row.member
        for row in db.query(GroupeMembers).filter(GroupeMembers.id_groupe == group_id).all()
        if row.member != sender_id
    ]
    for member_id in member_ids:
        db.add(NotificationMessagerie(id_utilisateur=member_id, id_groupe=group.id, type="group_message"))
    db.commit()
    db.refresh(message)
    return message


def get_group_messages(db: Session, *, group_id: str, current_user_id: str) -> list[dict]:
    require_group_member(db, group_id, current_user_id)
    messages = (
        db.query(Message)
        .filter(Message.id_groupe == group_id, Message.date_sup.is_(None))
        .order_by(Message.created_at.asc())
        .all()
    )
    return [serialize_message(message) for message in messages]


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

    add_group_member(db, group.id, resolved_creator, commit=False)
    for member_id in members:
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

    parts = group.name.split(":", 2)
    if len(parts) != 3 or parts[0] not in RESOURCE_TYPES:
        return False

    resource_type, resource_id = parts[0], parts[1]
    filters = [Membre.id_utilisateur == user_id, Membre.statut == "Actif", Membre.role.in_(MANAGER_ROLES)]
    if resource_type == "workspace":
        workspace = db.query(Workspace).filter(Workspace.id == resource_id).first()
        return bool(workspace and workspace.id_utilisateur == user_id) or bool(
            db.query(Membre.id).filter(and_(*filters), Membre.id_workspace == resource_id).first()
        )
    if resource_type == "espace":
        return bool(db.query(Membre.id).filter(and_(*filters), Membre.id_espace == resource_id).first())
    if resource_type == "liste":
        return bool(db.query(Membre.id).filter(and_(*filters), Membre.id_liste == resource_id).first())
    return False
