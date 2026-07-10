from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
import logging

from ..core.database import SessionLocal
from ..core.security import ALGORITHM, SECRET_KEY
from ..models import Utilisateur
from ..realtime import notification_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications temps réel"])


def _get_user_from_token(token: str | None):
    """Décoder JWT et récupérer l'utilisateur depuis le token."""
    if not token:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None

    if not user_id:
        return None

    db = SessionLocal()
    try:
        return db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    finally:
        db.close()


def _get_user_from_cookies(websocket: WebSocket):
    """Lire access_token depuis les cookies HttpOnly et décoder."""
    # ✅ DEBUG - Voir les cookies reçus
    logger.info(f"🔍 Cookies reçus: {list(websocket.cookies.keys())}")
    
    token = websocket.cookies.get("access_token")
    if not token:
        logger.warning("❌ No access_token in cookies")
        return None
    return _get_user_from_token(token)


@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket):
    """WebSocket pour notifications temps réel. Authentification via cookies uniquement."""
    user = _get_user_from_cookies(websocket)
    
    if not user:
        logger.warning("WebSocket auth failed: invalid or missing token")
        await websocket.close(code=1008)
        return

    logger.info(f"WebSocket connected for user {user.id}")
    
    await notification_manager.connect(user.id, websocket)
    try:
        while True:
            message = await websocket.receive_text()
            # Handle ping/pong for keep-alive
            if message == "ping":
                await websocket.send_text("pong")
            else:
                logger.debug(f"Received message from {user.id}: {message[:50]}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user.id}")
    finally:
        notification_manager.disconnect(user.id, websocket)