from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from backend.api_liste_et_tache.routes.utilisateur import router as utilisateur_router
    from backend.api_liste_et_tache.routes.entreprise import router as entreprise_router
else:
    from .routes.utilisateur import router as utilisateur_router
    from .routes.entreprise import router as entreprise_router

app = FastAPI(
    title="Microservice Api Liste",
    description="API pour la gestion des listes, tâches, canevas, sections et checklists",
    version="1.0.0"
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

@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Liste"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)
