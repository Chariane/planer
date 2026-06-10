from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from contextlib import asynccontextmanager
import sys
import os
from pathlib import Path

if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from backend.api_liste_et_tache.routes.utilisateur import router as utilisateur_router
    from backend.api_liste_et_tache.routes.entreprise import router as entreprise_router
    from backend.api_liste_et_tache.routes.dashboard import router as dashboard_router
    from backend.api_liste_et_tache.core.database import engine
    from backend.api_liste_et_tache.core.deadline_scheduler import deadline_reminder_scheduler
else:
    from .routes.utilisateur import router as utilisateur_router
    from .routes.entreprise import router as entreprise_router
    from .routes.dashboard import router as dashboard_router
    from .core.database import engine
    from .core.deadline_scheduler import deadline_reminder_scheduler


def ensure_runtime_columns() -> None:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE planer.tache ADD COLUMN IF NOT EXISTS id_createur varchar(12)"))
        conn.execute(text("ALTER TABLE planer.checklist ADD COLUMN IF NOT EXISTS id_createur varchar(12)"))
        conn.execute(text("ALTER TABLE planer.rapport ADD COLUMN IF NOT EXISTS owner_user_id varchar(12)"))
        conn.execute(text("ALTER TABLE planer.rapport ADD COLUMN IF NOT EXISTS owner_name_snapshot varchar(255)"))
        conn.execute(text("ALTER TABLE planer.rapport ADD COLUMN IF NOT EXISTS author_role varchar(30)"))
        conn.execute(text("ALTER TABLE planer.rapport ADD COLUMN IF NOT EXISTS id_liste varchar(12)"))
        conn.execute(text("ALTER TABLE planer.rapport ADD COLUMN IF NOT EXISTS id_espace varchar(12)"))
        conn.execute(text("ALTER TABLE planer.rapport ADD COLUMN IF NOT EXISTS id_workspace varchar(12)"))
        conn.execute(text("""
            UPDATE planer.rapport AS r
            SET
                owner_user_id = COALESCE(r.owner_user_id, m.id_utilisateur),
                author_role = COALESCE(r.author_role, m.role),
                id_liste = COALESCE(r.id_liste, m.id_liste),
                id_espace = COALESCE(r.id_espace, m.id_espace),
                id_workspace = COALESCE(r.id_workspace, m.id_workspace),
                owner_name_snapshot = COALESCE(
                    r.owner_name_snapshot,
                    NULLIF(TRIM(CONCAT(COALESCE(u.nom, ''), ' ', COALESCE(u.prenoms, ''))), ''),
                    u.username,
                    u.email,
                    'Utilisateur supprimé'
                )
            FROM planer.membre AS m
            LEFT JOIN public.utilisateur AS u ON u.id = m.id_utilisateur
            WHERE r.id_membre = m.id
        """))


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_runtime_columns()
    deadline_reminder_scheduler.start()
    try:
        yield
    finally:
        deadline_reminder_scheduler.stop()

app = FastAPI(
    title="Microservice Api Liste",
    description="API pour la gestion des listes, tâches, canevas, sections et checklists",
    version="1.0.0",
    lifespan=lifespan,
)

# Configuration CORS (à adapter selon tes besoins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Origine explicite pour allow_credentials=True
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(utilisateur_router)
app.include_router(entreprise_router)
app.include_router(dashboard_router)

# Monter le dossier des uploads pour servir les fichiers statiques
uploads_dir = Path(__file__).resolve().parent / "uploads"
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Liste"}


@app.get("/health")
def health():
    return {"service": "api_liste_et_tache", "status": "ok"}


@app.post("/deadlines/reminders/run")
def run_deadline_reminders_once(x_deadline_token: str | None = Header(default=None)):
    expected_token = os.getenv("DEADLINE_REMINDER_ADMIN_TOKEN")
    if expected_token and x_deadline_token != expected_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token de rappel invalide.")
    if not expected_token and os.getenv("ENV", "Dev") == "Prod":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Endpoint de rappel manuel desactive.")
    return deadline_reminder_scheduler.run_once()


@app.get("/deadlines/reminders/status")
def deadline_reminders_status():
    return {
        "enabled": deadline_reminder_scheduler.is_enabled,
        "running": deadline_reminder_scheduler.is_running,
        "interval_seconds": deadline_reminder_scheduler.interval_seconds,
        "manual_run_protected": bool(os.getenv("DEADLINE_REMINDER_ADMIN_TOKEN")),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)
