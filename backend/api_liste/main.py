from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import listes, taches, checklists, canevas, rapports

app = FastAPI(
    title="Microservice Liste (Projets, Tâches, Checklists)",
    description="API pour la gestion des listes, tâches et sous‑tâches",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(listes.router)
app.include_router(taches.router)
app.include_router(checklists.router)
app.include_router(canevas.router)
app.include_router(rapports.router)


@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Liste"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)