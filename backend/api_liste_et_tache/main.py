# backend/api_liste_et_tache/main.py
from fastapi import FastAPI, Header, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from contextlib import asynccontextmanager
import sys
import os
from pathlib import Path
from core.logging import security_logger
try:
    import redis.asyncio as redis
    from fastapi_limiter.depends import RateLimiter
    from fastapi_limiter.identifier import default_identifier
    from pyrate_limiter import Limiter, Rate, Duration
    from pyrate_limiter.buckets import RedisBucket
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("fastapi-limiter ou pyrate-limiter non installé")

if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from backend.api_liste_et_tache.routes.utilisateur import router as utilisateur_router
    from backend.api_liste_et_tache.routes.entreprise import router as entreprise_router
    from backend.api_liste_et_tache.routes.dashboard import router as dashboard_router
    from backend.api_liste_et_tache.routes.chat import router as chat_router
    from backend.api_liste_et_tache.core.database import engine
    from backend.api_liste_et_tache.core.deadline_scheduler import deadline_reminder_scheduler
else:
    from .routes.utilisateur import router as utilisateur_router
    from .routes.entreprise import router as entreprise_router
    from .routes.dashboard import router as dashboard_router
    from .routes.chat import router as chat_router
    from .core.database import engine
    from .core.deadline_scheduler import deadline_reminder_scheduler

# ============================================================================
# SECURITY HEADERS MIDDLEWARE
# ============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Ajoute les headers de sécurité à toutes les réponses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        env = os.getenv("ENV", "Dev")
        
        if env == "Production":
            # CSP STRICTE pour production
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
                "img-src 'self' data: https:; "
                "font-src 'self' https://fonts.gstatic.com; "
                "connect-src 'self' https://*.k-planer.com wss://*.k-planer.com; "
                "frame-ancestors 'none'; "
                "form-action 'self'; "
                "base-uri 'self'; "
                "upgrade-insecure-requests"
            )
        else:
            # CSP PERMISSIVE pour développement (inclut le CDN pour Swagger)
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' https: http://localhost:* ws://localhost:* wss://*.k-planer.com; "
                "frame-ancestors 'none'; "
                "form-action 'self'; "
                "base-uri 'self'; "
                "upgrade-insecure-requests"
            )
        
        if env == "Production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        
        return response

# ============================================================================
# LIFESPAN
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    if REDIS_AVAILABLE:
        try:
            redis_client = redis.from_url(redis_url, encoding="utf8", decode_responses=True)
            redis_bucket = await RedisBucket.init(
                [Rate(5, Duration.MINUTE)],
                redis_client,
                bucket_key="api_liste_et_tache_rate_limiter"
            )
            app.state.rate_limiter = RateLimiter(Limiter(redis_bucket), identifier=default_identifier)
            app.state.redis_client = redis_client
            print(f"Rate Limiting activé avec Redis: {redis_url}")
            security_logger.log_auth(
                action="rate_limiter_startup",
                user_id="system",
                ip="127.0.0.1",
                status="success",
                details={"redis_url": redis_url}
            )
        except Exception as e:
            print(f"ERREUR: Impossible de connecter Redis: {e}")
            print("Rate Limiting désactivé (fallback)")
            security_logger.log_error(
                error_type="redis_connection_failed",
                message=str(e),
                details={"redis_url": redis_url}
            )
    else:
        print("fastapi-limiter ou pyrate-limiter non disponible")
        print("Rate Limiting désactivé (fallback)")
    
    # Démarrer le scheduler
    deadline_reminder_scheduler.start()
    
    yield
    
    # Arrêt
    deadline_reminder_scheduler.stop()
    if getattr(app.state, "redis_client", None) is not None:
        await app.state.redis_client.close()
        try:
            await app.state.redis_client.wait_closed()
        except Exception:
            pass
        print("Rate Limiting arrêté")

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Microservice Api Liste",
    description="API pour la gestion des listes, tâches, canevas, sections et checklists",
    version="1.0.0",
    lifespan=lifespan,
)



# ============================================================================
# CORS CONFIGURATION SÉCURISÉE
# ============================================================================

ALLOWED_ORIGINS_STR = os.getenv("ALLOW_ORIGINS", "http://localhost:5173,http://localhost:3000")
if ALLOWED_ORIGINS_STR == "*":
    if os.getenv("ENV", "Dev") == "Production":
        print("ATTENTION: CORS avec * en production est DANGEREUX!")
        ALLOWED_ORIGINS = ["https://k-planer.com", "https://app.k-planer.com"]
    else:
        ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(",")]

ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
ALLOWED_HEADERS = ["Authorization", "Content-Type", "Accept", "X-Requested-With"]

print(f"CORS Allowed Origins: {ALLOWED_ORIGINS}")
print(f"CORS Allowed Methods: {ALLOWED_METHODS}")
print(f"CORS Allowed Headers: {ALLOWED_HEADERS}")

security_logger.log_auth(
    action="cors_config",
    user_id="system",
    ip="127.0.0.1",
    status="success",
    details={
        "allowed_origins": ALLOWED_ORIGINS,
        "allowed_methods": ALLOWED_METHODS,
        "allowed_headers": ALLOWED_HEADERS
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
    expose_headers=["X-Total-Count", "X-Page-Count"],
    max_age=86400,
)

app.add_middleware(SecurityHeadersMiddleware)

# ============================================================================
# ROUTES
# ============================================================================

app.include_router(utilisateur_router)
app.include_router(entreprise_router)
app.include_router(dashboard_router)
app.include_router(chat_router)

# Monter le dossier des uploads
uploads_dir = Path(__file__).resolve().parent / "uploads"
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Liste"}

@app.get("/health")
def health():
    security_logger.log_access(
        user_id="system",
        resource_type="health",
        resource_id="check",
        action="GET",
        allowed=True
    )
    return {"service": "api_liste_et_tache", "status": "ok"}

@app.post("/deadlines/reminders/run")
def run_deadline_reminders_once(x_deadline_token: str | None = Header(default=None)):
    expected_token = os.getenv("DEADLINE_REMINDER_ADMIN_TOKEN")
    if expected_token and x_deadline_token != expected_token:
        security_logger.log_auth(
            action="deadline_reminder_unauthorized",
            user_id="unknown",
            ip="unknown",
            status="failure",
            details={"reason": "invalid_token"}
        )
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

# ============================================================================
# STARTUP / SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup():
    env = os.getenv("ENV", "Dev")
    print("API Liste & Tâche démarrée avec sécurité renforcée")
    print(f"Security Headers activés (CSP {'strict' if env == 'Production' else 'permissive'})")
    print(f"CORS: {ALLOWED_ORIGINS}")
    security_logger.log_auth(
        action="startup",
        user_id="system",
        ip="127.0.0.1",
        status="success",
        details={"message": "API Liste & Tâche démarrée"}
    )

@app.on_event("shutdown")
async def shutdown():
    print("API Liste & Tâche arrêtée")
    security_logger.log_auth(
        action="shutdown",
        user_id="system",
        ip="127.0.0.1",
        status="success",
        details={"message": "API Liste & Tâche arrêtée"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)