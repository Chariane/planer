from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from backend.api_notification.routes.utilisateur import router as utilisateur_router
else:
    from .routes.utilisateur import router as utilisateur_router

app = FastAPI(
    title="Microservice Api Notification",
    description="API pour la lecture et la gestion des notifications utilisateur",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(utilisateur_router)


@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Notification"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
