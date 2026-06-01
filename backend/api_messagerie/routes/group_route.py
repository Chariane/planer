from fastapi import APIRouter, Depends, WebSocket, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_user
from ..schemas import (
    GroupCreate,
    MessageCreate,
    ResourceGroupEnsure,
    ResourceGroupMemberSync,
    UtilisateurOut,
)
from .logique import (
    add_group_member,
    create_group,
    create_group_message,
    ensure_resource_group,
    get_group_members,
    get_group_messages,
    get_resource_group,
    get_unread_summary,
    list_user_groups,
    remove_group_member,
    remove_resource_member,
    serialize_group,
    serialize_message,
    sync_resource_member,
)
from .manager import manager
from .ws import group_chat

router = APIRouter(prefix="/messagerie", tags=["Messagerie groupes"])


@router.post("/groups", status_code=status.HTTP_201_CREATED)
def create_manual_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    group = create_group(
        db,
        name=payload.name,
        creator_id=current_user.id,
        members=payload.members,
    )
    return serialize_group(db, group)


@router.get("/groups")
def my_groups(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return {"groups": list_user_groups(db, current_user.id)}


@router.get("/unread-summary")
def unread_summary(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return get_unread_summary(db, user_id=current_user.id)


@router.get("/groups/{group_id}/members")
def group_members(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return {"members": get_group_members(db, group_id, current_user.id)}


@router.post("/groups/{group_id}/members/{user_id}")
def add_member(
    group_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    members = get_group_members(db, group_id, current_user.id)
    current_membership = next((member for member in members if member["id"] == current_user.id), None)
    if not current_membership or current_membership["role"] != "Administrateur":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Seuls les administrateurs du groupe peuvent ajouter des membres.")
    add_group_member(db, group_id, user_id)
    return {"success": True}


@router.delete("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    group_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    members = get_group_members(db, group_id, current_user.id)
    current_membership = next((member for member in members if member["id"] == current_user.id), None)
    if not current_membership or current_membership["role"] != "Administrateur":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Seuls les administrateurs du groupe peuvent retirer des membres.")
    remove_group_member(db, group_id, user_id)
    return None


@router.get("/groups/{group_id}/messages")
def group_messages(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return {"messages": get_group_messages(db, group_id=group_id, current_user_id=current_user.id)}


@router.post("/groups/{group_id}/messages")
async def send_group_message(
    group_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    message = create_group_message(
        db,
        group_id=group_id,
        sender_id=current_user.id,
        payload=payload,
    )
    message_payload = serialize_message(message)
    await manager.broadcast_group_message(db, group_id, message_payload)
    return message_payload


@router.websocket("/ws/groups/{group_id}")
async def group_ws(websocket: WebSocket, group_id: str):
    return await group_chat(websocket, group_id)


@router.post("/internal/resources/{resource_type}/{resource_id}/ensure-group")
def ensure_group_for_resource(
    resource_type: str,
    resource_id: str,
    payload: ResourceGroupEnsure,
    db: Session = Depends(get_db),
):
    group = ensure_resource_group(
        db,
        resource_type=resource_type,
        resource_id=resource_id,
        name=payload.name,
        creator_id=payload.creator_id,
        members=payload.members,
    )
    return serialize_group(db, group)


@router.get("/internal/resources/{resource_type}/{resource_id}/group")
def get_group_for_resource(
    resource_type: str,
    resource_id: str,
    db: Session = Depends(get_db),
):
    group = get_resource_group(db, resource_type, resource_id)
    return {"group": serialize_group(db, group) if group else None}


@router.post("/internal/resources/{resource_type}/{resource_id}/members/{user_id}")
def sync_member_for_resource(
    resource_type: str,
    resource_id: str,
    user_id: str,
    payload: ResourceGroupMemberSync,
    db: Session = Depends(get_db),
):
    group = sync_resource_member(
        db,
        resource_type=resource_type,
        resource_id=resource_id,
        user_id=user_id,
        name=payload.name,
        creator_id=payload.creator_id,
    )
    return serialize_group(db, group)


@router.delete("/internal/resources/{resource_type}/{resource_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_for_resource(
    resource_type: str,
    resource_id: str,
    user_id: str,
    db: Session = Depends(get_db),
):
    remove_resource_member(db, resource_type=resource_type, resource_id=resource_id, user_id=user_id)
    return None
