from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from user_route import router as user_router
from admin_routes import router as admin_router
from entreprise_route import router as entreprise_router

app = FastAPI(
    title="Microservice Api Gateway",
    description="API pour la gestion des utilisateurs, entreprises et authentification",
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

# Inclusion des routes
app.include_router(user_router, prefix="/api", tags=["users"])
app.include_router(admin_router, prefix="/api", tags=["admin"])
app.include_router(entreprise_router, prefix="/api", tags=["entreprise"])

@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Gateway"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8006, reload=True)
