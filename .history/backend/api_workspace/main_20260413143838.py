from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
from pathlib import Path 

if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from backend.api_workspace.routes.admin import router as admin_router
    from backend.api_workspace.routes.entreprise import router as entreprise_router
    from backend.api_workspace.routes.super_admin import router as super_admin_router
else:
    from .routes.admin import router as admin_router
    from .routes.entreprise import router as entreprise_router


app = FastAPI(
    title="Microservice Api Workspace",
    description="API pour la gestion des workspaces et membres",
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

app.include_router(workspaces_router)
app.include_router(entreprise_workspaces_router)
app.include_router(admin_workspaces_router)

@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Workspace"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
