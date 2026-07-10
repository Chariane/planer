from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from ..core.database import SessionLocal
from ..core.security import ALGORITHM, SECRET_KEY
from ..models import Utilisateur
from ..realtime import notification_manager


router = APIRouter(prefix="/notifications", tags=["Notifications temps réel"])


def _get_ws_user(token: str | None):
    if not token:
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


@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket):
    # Lire le token depuis les cookies
    token = websocket.cookies.get("access_token")
    
    # Fallback: token dans l'URL (pour compatibilité)
    if not token:
        token = websocket.query_params.get("token")
    
    user = _get_ws_user(token)
    if not user:
        await websocket.close(code=1008)
        return

    await notification_manager.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        notification_manager.disconnect(user.id, websocket)
