from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.utilisateur import router as workspaces_router

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

@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Workspace"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
