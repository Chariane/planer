from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.notifications import router as notifications_router

app = FastAPI(
    title="Microservice Api Notification",
    description="API pour la gestion des rapports et absences/congés",
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

app.include_router(notifications_router)

@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Notification"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8006, reload=True)