from typing import Dict, List
from fastapi import WebSocket
import json

from ..models import GroupeMembers


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.typing_status: Dict[str, str] = {}
        self.registered_users: set[str] = set()

    async def connect(self, websocket: WebSocket, pseudo: str):
        await websocket.accept()
        self.active_connections[pseudo] = websocket

    def disconnect(self, pseudo: str):
        self.active_connections.pop(pseudo, None)
        self.typing_status.pop(pseudo, None)
    
    def register(self, pseudo: str):
        self.registered_users.add(pseudo)
    def get_users(self) -> List[str]:
        return list(self.registered_users)

    async def send_private_message(self, msg_obj: dict, receiver: str, sender: str):
        ws_receiver = self.active_connections.get(receiver)
        ws_sender = self.active_connections.get(sender)
        msg_json = json.dumps(msg_obj, default=str)
        if ws_receiver:
            await ws_receiver.send_text(msg_json)
        if ws_sender and ws_sender != ws_receiver:
            await ws_sender.send_text(msg_json)

    async def broadcast_typing(self, sender: str, receiver: str, is_typing: bool):
        ws_receiver = self.active_connections.get(receiver)
        if ws_receiver:
            await ws_receiver.send_text(json.dumps({
                "type": "typing",
                "from": sender,
                "typing": is_typing
            }))

    async def broadcast_group_message(self, db, group_id: str, msg_obj: dict):
        member_ids = [
            row.member
            for row in db.query(GroupeMembers).filter(GroupeMembers.id_groupe == group_id).all()
        ]
        msg_json = json.dumps(msg_obj, default=str)
        for member_id in member_ids:
            websocket = self.active_connections.get(member_id)
            if websocket:
                await websocket.send_text(msg_json)

manager = ConnectionManager()
