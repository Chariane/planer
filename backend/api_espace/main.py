from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from backend.api_espace.routes.utilisateur import router as espaces_router
else:
    from .routes.utilisateur import router as espaces_router

app = FastAPI(
    title="Microservice Api Espace",
    description="API pour la gestion des espaces",
    version="1.0.0"
)

# Configuration CORS (à adapter selon tes besoins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(espaces_router)

@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Espace"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
