import json
from typing import Optional

from fastapi import WebSocket
from jose import JWTError, jwt

from ..core.database import SessionLocal
from ..core.security import ALGORITHM, SECRET_KEY
from ..models import Utilisateur
from ..schemas import MessageCreate
from .logique import create_group_message, create_private_message, serialize_message
from .manager import manager
from .presence import record_user_disconnect


def _get_ws_user(token: Optional[str]):
    if not token or SessionLocal is None:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError:
        return None
    if not user_id:
        return None

    db = SessionLocal()
    try:
        return db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    finally:
        db.close()


def _message_payload_from_ws(raw: str) -> MessageCreate:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return MessageCreate(message=raw, type="text")

    if not isinstance(data, dict):
        return MessageCreate(message=str(data), type="text")

    msg_type = data.get("type") or "text"
    return MessageCreate(
        message=data.get("message") or "",
        type=msg_type,
        audio=data.get("audio") or (data.get("data") if msg_type == "audio" else None),
        image=data.get("image") or (data.get("data") if msg_type == "image" else None),
        video=data.get("video") or (data.get("data") if msg_type == "video" else None),
        file=data.get("file") or (data.get("data") if msg_type == "file" else None),
    )


async def private_chat_ws(websocket: WebSocket, receiver_id: str):
    token = websocket.query_params.get("token")
    user = _get_ws_user(token)
    if not user:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user.id)
    db = SessionLocal()
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                if isinstance(data, dict) and data.get("type") == "typing":
                    await manager.broadcast_typing(user.id, receiver_id, bool(data.get("typing")))
                    continue
                if isinstance(data, dict) and data.get("type") == "seen":
                    await manager.send_private_message({"type": "seen", "from": user.id}, receiver_id, user.id)
                    continue
                if isinstance(data, dict) and str(data.get("type", "")).startswith("call_"):
                    data["from"] = user.id
                    await manager.send_private_message(data, receiver_id, user.id)
                    continue

                message = create_private_message(
                    db,
                    sender_id=user.id,
                    receiver_id=receiver_id,
                    payload=_message_payload_from_ws(raw),
                )
                await manager.send_private_message(serialize_message(message), receiver_id, user.id)
            except Exception as exc:
                await websocket.send_text(json.dumps({"error": str(exc)}))
    finally:
        manager.disconnect(user.id)
        try:
            record_user_disconnect(db, user.id)
        finally:
            db.close()


async def group_chat(websocket: WebSocket, group_id: str):
    token = websocket.query_params.get("token")
    user = _get_ws_user(token)
    if not user:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user.id)
    db = SessionLocal()
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                if isinstance(data, dict) and str(data.get("type", "")).startswith("call_"):
                    data["from"] = user.id
                    data["id_groupe"] = group_id
                    await manager.broadcast_group_message(db, group_id, data)
                    continue

                message = create_group_message(
                    db,
                    group_id=group_id,
                    sender_id=user.id,
                    payload=_message_payload_from_ws(raw),
                )
                await manager.broadcast_group_message(db, group_id, serialize_message(message))
            except Exception as exc:
                await websocket.send_text(json.dumps({"error": str(exc)}))
    finally:
        manager.disconnect(user.id)
        try:
            record_user_disconnect(db, user.id)
        finally:
            db.close()
