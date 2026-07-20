# backend/api_gateway/main.py
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from fastapi_csrf_protect import CsrfProtect
from pydantic import BaseModel, Field
import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager
import redis.asyncio as redis
import secrets

try:
    from fastapi_limiter.depends import RateLimiter
    from fastapi_limiter.identifier import default_identifier
    from pyrate_limiter import Limiter, Rate, Duration
    from pyrate_limiter.buckets import RedisBucket
except Exception:
    RateLimiter = None
    default_identifier = None
    Limiter = None
    Rate = None
    Duration = None
    RedisBucket = None

from core.logging import security_logger

# ============================================================================
# ROUTES IMPORTS
# ============================================================================
# Support pour exécution en mode module/package ou en script direct.
if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from backend.api_gateway.routes.admin import router as admin_router
    from backend.api_gateway.routes.auth import router as auth_router
    from backend.api_gateway.routes.entreprise import router as entreprise_router
    from backend.api_gateway.routes.super_admin import router as super_admin_router
else:
    from .routes.admin import router as admin_router
    from .routes.auth import router as auth_router
    from .routes.entreprise import router as entreprise_router
    from .routes.super_admin import router as super_admin_router

# ============================================================================
# ✅ CONFIGURATION CSRF - VERSION COMPATIBLE 1.0.7
# ============================================================================

# Générer une clé secrète si non définie
CSRF_SECRET = os.getenv("CSRF_SECRET_KEY")
if not CSRF_SECRET or len(CSRF_SECRET) < 32:
    CSRF_SECRET = secrets.token_urlsafe(32)
    os.environ["CSRF_SECRET_KEY"] = CSRF_SECRET
    print(f"⚠️ Clé CSRF générée automatiquement: {CSRF_SECRET[:10]}...")

# Configuration CSRF
class CsrfSettings(BaseModel):
    secret_key: str = CSRF_SECRET
    cookie_key: str = "_csrf_token"
    header_name: str = "X-CSRF-Token"
    cookie_secure: bool = os.getenv("ENV", "Dev") == "Production"
    cookie_httponly: bool = True
    cookie_samesite: str = "lax"

try:
    # ✅ Configuration pour fastapi-csrf-protect 1.0.7
    # load_config() attend une classe, pas une instance
    CsrfProtect.load_config(CsrfSettings)
    # ✅ Créer une instance singleton pour utiliser les méthodes
    csrf_protect = CsrfProtect()
    print("✅ CSRF Protection configurée avec succès")
except Exception as e:
    print(f"⚠️ ERREUR CSRF init: {e}")
    # Mode fallback: les attributs seront définis directement sur CsrfProtect
    CsrfProtect._secret_key = CSRF_SECRET
    CsrfProtect._cookie_key = "_csrf_token"
    CsrfProtect._header_name = "X-CSRF-Token"
    csrf_protect = None

# ============================================================================
# LIFESPAN - GESTION DU CYCLE DE VIE AVEC RATE LIMITING
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application avec Redis + Rate Limiting"""
    
    # DÉMARRAGE - Initialiser Redis et Rate Limiter
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    if RateLimiter is not None and RedisBucket is not None:
        try:
            redis_client = redis.from_url(redis_url, encoding="utf8", decode_responses=True)
            redis_bucket = await RedisBucket.init(
                [Rate(5, Duration.MINUTE)],
                redis_client,
                bucket_key="api_gateway_rate_limiter"
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
        print("fastapi_limiter ou pyrate_limiter n'est pas disponible dans cette version.")
        print("Rate Limiting désactivé (fallback)")
        security_logger.log_error(
            error_type="rate_limiter_unavailable",
            message="RateLimiter or RedisBucket unavailable in installed fastapi_limiter/pyrate_limiter versions",
            details={"redis_url": redis_url}
        )

    yield  # L'application tourne ici

    # ARRÊT - Fermer Redis si le client a été créé
    if getattr(app.state, "redis_client", None) is not None:
        await app.state.redis_client.close()
        try:
            await app.state.redis_client.wait_closed()
        except Exception:
            pass
        print("Rate Limiting arrêté")
        security_logger.log_auth(
            action="rate_limiter_shutdown",
            user_id="system",
            ip="127.0.0.1",
            status="success"
        )

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
        
        # HSTS - Force HTTPS (uniquement en production)
        if env == "Production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        # X-Frame-Options - Anti-clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # X-Content-Type-Options - Anti-MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # X-XSS-Protection - Protection XSS (legacy)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer-Policy - Limite fuite d'informations
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions-Policy - Contrôle des fonctionnalités
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        
        return response

# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Microservice Api Gateway",
    description="API pour la gestion des utilisateurs, entreprises et authentification",
    version="1.0.0",
    lifespan=lifespan  
)



# ============================================================================
# CORS CONFIGURATION SÉCURISÉE
# ============================================================================

# Lire depuis l'environnement avec fallback sécurisé
ALLOWED_ORIGINS_STR = os.getenv("ALLOW_ORIGINS", "http://localhost:5173,http://localhost:3000")
if ALLOWED_ORIGINS_STR == "*":
    # En développement uniquement, jamais en production
    if os.getenv("ENV", "Dev") == "Production":
        print("ATTENTION: CORS avec * en production est DANGEREUX!")
        ALLOWED_ORIGINS = ["https://k-planer.com", "https://app.k-planer.com"]
    else:
        ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(",")]

# Méthodes autorisées (explicites, pas *)
ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]

# Headers autorisés (explicites, pas *)
ALLOWED_HEADERS = ["Authorization", "Content-Type", "Accept", "X-Requested-With", "X-CSRF-Token", "x-csrf-token"]

print(f"CORS Allowed Origins: {ALLOWED_ORIGINS}")
print(f"CORS Allowed Methods: {ALLOWED_METHODS}")
print(f"CORS Allowed Headers: {ALLOWED_HEADERS}")

# Log la configuration CORS
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
    max_age=86400,  # 24 heures
)

app.add_middleware(SecurityHeadersMiddleware)

# ============================================================================
# CSRF MIDDLEWARE
# ============================================================================

@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    """
    Middleware CSRF : Vérifie le token pour les méthodes mutatives
    - Skip GET, HEAD, OPTIONS
    - Skip endpoints publics
    - Valide token CSRF depuis header X-CSRF-Token + cookie _csrf_token
    """
    # Skip pour les méthodes non mutatives
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return await call_next(request)
    
    # Skip pour les endpoints publics
    public_paths = [
        "/auth/login", 
        "/auth/register", 
        "/auth/reset-password",
        "/auth/forgot-password",
        "/auth/refresh",
        "/csrf-token",
        "/health",
        "/",
        "/auth/resend-verification-code"
    ]
    if request.url.path in public_paths:
        return await call_next(request)
    
    # ✅ Vérifier CSRF
    if csrf_protect is None:
        # CSRF non initialisée - laisser passer en mode fallback
        security_logger.log_error(
            error_type="csrf_protection_unavailable",
            message="CSRF Protection non initialisée",
            details={"path": request.url.path}
        )
        return await call_next(request)
    
    try:
        # ✅ Valider le token CSRF
        # validate_csrf() lit:
        # - le cookie _csrf_token (signed_token)
        # - le token depuis header X-CSRF-Token ou body
        await csrf_protect.validate_csrf(request)
        
        security_logger.log_auth(
            action="csrf_validation_success",
            user_id="unknown",
            ip=request.client.host if request.client else "unknown",
            status="success",
            details={"path": request.url.path, "method": request.method}
        )
        return await call_next(request)
        
    except Exception as e:
        security_logger.log_auth(
            action="csrf_validation_failed",
            user_id="unknown",
            ip=request.client.host if request.client else "unknown",
            status="failure",
            details={"path": request.url.path, "method": request.method, "error": str(e)}
        )
        
        # Retourner une réponse 403 Forbidden
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "detail": f"Validation CSRF échouée: {str(e)}"
            }
        )

# ============================================================================
# ROUTES
# ============================================================================

app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(entreprise_router)
app.include_router(super_admin_router)


@app.get("/")
def root():
    return {"message": "Bienvenue sur le microservice Api Gateway"}


@app.get("/health")
def health():
    security_logger.log_access(
        user_id="system",
        resource_type="health",
        resource_id="check",
        action="GET",
        allowed=True
    )
    return {"service": "api_gateway", "status": "ok"}


@app.get("/csrf-token")
async def get_csrf_token(request: Request):
    """
    Récupère un token CSRF pour le frontend
    
    Le frontend doit envoyer ce token dans le header X-CSRF-Token
    pour les requêtes mutatives (POST, PUT, DELETE, PATCH)
    """
    try:
        if csrf_protect is None:
            raise RuntimeError("CSRF Protection non initialisée")
        
        # ✅ Générer le token et le token signé
        # generate_csrf_tokens() retourne (token_brut, token_signé)
        token, signed_token = csrf_protect.generate_csrf_tokens()
        
        # Créer la réponse avec le cookie signé
        response = JSONResponse(
            content={
                "csrf_token": token,
                "message": "Token CSRF généré avec succès"
            }
        )
        
        # ✅ Définir le cookie signé (httponly pour sécurité)
        csrf_protect.set_csrf_cookie(signed_token, response)
        
        security_logger.log_access(
            user_id="anonymous",
            resource_type="csrf",
            resource_id="token_generation",
            action="GET",
            allowed=True
        )
        
        return response
    except Exception as e:
        security_logger.log_error(
            error_type="csrf_token_generation_failed",
            message=str(e),
            details={"ip": request.client.host if request.client else "unknown"}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la génération du token CSRF"
        )


# ============================================================================
# STARTUP / SHUTDOWN (fallback si lifespan non supporté)
# ============================================================================

@app.on_event("startup")
async def startup():
    print("🚀 API Gateway démarrée avec sécurité renforcée")
    print(f"🔒 CSRF Protection: ACTIVÉE (endpoint: GET /csrf-token)")
    print(f"🌐 CORS: {ALLOWED_ORIGINS}")
    security_logger.log_auth(
        action="startup",
        user_id="system",
        ip="127.0.0.1",
        status="success",
        details={"message": "API Gateway démarrée avec CSRF Protection"}
    )

@app.on_event("shutdown")
async def shutdown():
    print("API Gateway arrêtée")
    security_logger.log_auth(
        action="shutdown",
        user_id="system",
        ip="127.0.0.1",
        status="success",
        details={"message": "API Gateway arrêtée"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)