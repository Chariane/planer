from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from ..database import get_db
from ..security import get_current_user_ws
from ..crud.notification_crud import get_notifications_for_user

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except:
                pass

manager = ConnectionManager()

async def websocket_handler(websocket: WebSocket, token: str = None):
    user_id = await get_current_user_ws(websocket, token)
    if not user_id:
        await websocket.close(code=1008)
        return
    await manager.connect(websocket, user_id)
    db: Session = next(get_db())
    try:
        unread = get_notifications_for_user(db, user_id, only_unread=True)
        await websocket.send_json({
            "type": "history",
            "data": [
                {
                    "id": n.id,
                    "type": n.type,
                    "message": n.message,
                    "date": n.date_creation.isoformat()
                } for n in unread
            ]
        })
        while True:
            await websocket.receive_text()  # maintien de connexion
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    finally:
        db.close()