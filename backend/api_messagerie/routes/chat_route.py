from fastapi import APIRouter, Depends, WebSocket
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_user
from ..schemas import MessageCreate, UtilisateurOut
from .logique import create_private_message, get_private_messages, serialize_message
from .manager import manager
from .ws import private_chat_ws

router = APIRouter(prefix="/messagerie", tags=["Messagerie privée"])


@router.get("/private/{other_user_id}/messages")
def get_private_history(
    other_user_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    return {
        "messages": get_private_messages(
            db,
            current_user_id=current_user.id,
            other_user_id=other_user_id,
        )
    }


@router.post("/private/{receiver_id}/messages")
async def send_private_message(
    receiver_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user),
):
    message = create_private_message(
        db,
        sender_id=current_user.id,
        receiver_id=receiver_id,
        payload=payload,
    )
    message_payload = serialize_message(message)
    await manager.send_private_message(message_payload, receiver_id, current_user.id)
    return message_payload


@router.websocket("/ws/private/{receiver_id}")
async def private_chat(websocket: WebSocket, receiver_id: str):
    return await private_chat_ws(websocket, receiver_id)
