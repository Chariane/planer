from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import sys
from pathlib import Path

if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from backend.api_notification.realtime import notification_listener, notification_manager
    from backend.api_notification.routes.utilisateur import router as utilisateur_router
    from backend.api_notification.routes.ws import router as ws_router
else:
    from .realtime import notification_listener, notification_manager
    from .routes.utilisateur import router as utilisateur_router
    from .routes.ws import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    notification_manager.set_loop(asyncio.get_running_loop())
    notification_listener.start()
    try:
        yield
    finally:
        notification_listener.stop()

app = FastAPI(
    title="Microservice Api Notification",
    description="API pour la lecture et la gestion des notifications utilisateur",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(utilisateur_router)
app.include_router(ws_router)


@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Notification"}


@app.get("/health")
def health():
    return {"service": "api_notification", "status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
