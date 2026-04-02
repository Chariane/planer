# api_notification/main.py
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from .routes.notifications import router as notifications_router
from .routes.websocket import websocket_handler

app = FastAPI(
    title="Microservice Notifications",
    description="Gestion des notifications et WebSocket temps réel",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notifications_router)

@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    await websocket_handler(websocket, token)