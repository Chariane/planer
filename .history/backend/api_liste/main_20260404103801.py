from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.listes import router as listes_router

app = FastAPI(
    title="Microservice Api Liste",
    description="API pour la gestion des listes, tâches, canevas, sections et checklists",
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

app.include_router(listes_router)

@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Liste"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)