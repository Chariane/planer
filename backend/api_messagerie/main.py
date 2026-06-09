from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text


if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from backend.api_messagerie.routes.chat_route import router as chat_router
    from backend.api_messagerie.core.database import engine
    from backend.api_messagerie.routes.group_route import router as group_router
else:
    from .core.database import engine
    from .routes.chat_route import router as chat_router
    from .routes.group_route import router as group_router


def ensure_messagerie_schema() -> None:
    if engine is None:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE messagerie.groupe ADD COLUMN IF NOT EXISTS is_closed boolean DEFAULT false NOT NULL"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_messagerie_schema()
    yield


app = FastAPI(
    title="Microservice Messagerie K-Planner",
    description="Messagerie privee et groupes automatiques lies aux ressources K-Planner.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(group_router)


@app.get("/")
def root():
    return {
        "service": "api_messagerie",
        "status": "ok",
        "message": "Bienvenue sur le microservice Messagerie K-Planner",
    }


@app.get("/health")
def health():
    return {"service": "api_messagerie", "status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.api_messagerie.main:app",
        host="0.0.0.0",
        port=8006,
        reload=True,
    )
