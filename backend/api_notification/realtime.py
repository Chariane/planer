from __future__ import annotations

import asyncio
import json
import logging
import select
import threading
from typing import Any

from fastapi import WebSocket
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from .core.database import engine


NOTIFICATION_CHANNEL = "kplanner_notifications"
logger = logging.getLogger(__name__)


class NotificationConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = {}
        self._loop: asyncio.AbstractEventLoop | None = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, user_id: str, websocket: WebSocket, subprotocol: str | None = None) -> None:
        await websocket.accept(subprotocol=subprotocol)
        self._connections.setdefault(user_id, set()).add(websocket)
        await websocket.send_json({"event": "connected"})

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, payload: dict[str, Any]) -> None:
        sockets = list(self._connections.get(user_id, set()))
        if not sockets:
            return

        stale: list[WebSocket] = []
        for websocket in sockets:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)

        for websocket in stale:
            self.disconnect(user_id, websocket)

    async def broadcast_payload(self, payload: dict[str, Any]) -> None:
        notification = payload.get("notification") or {}
        user_id = notification.get("id_utilisateur")
        if user_id:
            await self.send_to_user(str(user_id), payload)
            return

        if notification.get("est_globale"):
            for target_user_id in list(self._connections):
                await self.send_to_user(target_user_id, payload)

    def publish_from_thread(self, payload: dict[str, Any]) -> None:
        if not self._loop:
            return
        asyncio.run_coroutine_threadsafe(self.broadcast_payload(payload), self._loop)


notification_manager = NotificationConnectionManager()


class NotificationListener:
    def __init__(self) -> None:
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, name="notification-listener", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    def _run(self) -> None:
        connection = None
        cursor = None
        try:
            connection = engine.raw_connection()
            connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = connection.cursor()
            cursor.execute(f"LISTEN {NOTIFICATION_CHANNEL};")
            logger.info("Notification realtime listener started on channel %s", NOTIFICATION_CHANNEL)

            while not self._stop_event.is_set():
                if select.select([connection], [], [], 1) == ([], [], []):
                    continue
                connection.poll()
                while connection.notifies:
                    notify = connection.notifies.pop(0)
                    try:
                        payload = json.loads(notify.payload)
                    except json.JSONDecodeError:
                        logger.warning("Notification realtime payload invalide: %s", notify.payload)
                        continue
                    notification_manager.publish_from_thread(payload)
        except Exception as exc:
            logger.warning("Notification realtime listener stopped: %s", exc)
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()


notification_listener = NotificationListener()
