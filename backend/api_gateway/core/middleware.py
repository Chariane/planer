# backend/api_gateway/core/middleware.py
import logging
from datetime import datetime, timedelta
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from jose import JWTError, jwt
import os
from dotenv import dotenv_values
from .cookies import COOKIE_SECURE, COOKIE_SAMESITE

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
config_data = {**dotenv_values(os.path.join(BASE_DIR, ".env")), **os.environ}
SECRET_KEY = config_data.get("SECRET_KEY")
ALGORITHM = config_data.get("ALGORITHM", "HS256")

class TokenRefreshMiddleware(BaseHTTPMiddleware):
    """
    Middleware qui intercepte les requêtes avec token expiré
    et tente de les rafraîchir automatiquement.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Ne pas intervenir sur les endpoints publics
        public_paths = [
            "/auth/login", 
            "/auth/register", 
            "/auth/refresh",
            "/auth/forgot-password",
            "/auth/reset-password",
            "/auth/verify-email-code",
            "/auth/resend-verification-code",
            "/health",
            "/",
        ]
        
        # ✅ Vérifier si le chemin est public
        if any(request.url.path.startswith(path) for path in public_paths):
            return await call_next(request)
        
        # ✅ Vérifier si c'est une requête avec token
        token = request.cookies.get("access_token")
        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]
        
        if not token:
            return await call_next(request)
        
        # ✅ Vérifier si le token est expiré
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": True})
            # Token valide, continuer
            return await call_next(request)
            
        except JWTError as e:
            # ✅ Token invalide ou expiré
            if "Signature verification failed" in str(e):
                # Token corrompu → rediriger vers login
                return self._redirect_to_login()
            
            if "Token has expired" in str(e) or "Expired" in str(e):
                # ✅ Token EXPIRÉ → tenter de rafraîchir
                logger.info(f"Token expiré pour {request.url.path}, tentative de rafraîchissement...")
                
                # Récupérer le refresh token
                refresh_token = request.cookies.get("refresh_token")
                if not refresh_token:
                    return self._redirect_to_login()
                
                # ✅ Tenter de rafraîchir via l'endpoint /auth/refresh
                try:
                    import httpx
                    async with httpx.AsyncClient() as client:
                        # Construire l'URL complète
                        refresh_url = f"{request.base_url}auth/refresh"
                        
                        # Appeler le endpoint de refresh
                        response = await client.post(
                            refresh_url,
                            cookies={"refresh_token": refresh_token},
                            timeout=5
                        )
                        
                        if response.status_code == 200:
                            # ✅ Rafraîchissement réussi
                            new_access_token = response.cookies.get("access_token")
                            new_refresh_token = response.cookies.get("refresh_token")
                            
                            if new_access_token:
                                # ✅ Rejouer la requête originale avec le nouveau token
                                # Créer une nouvelle requête avec le token rafraîchi
                                updated_request = Request({
                                    "type": request.scope["type"],
                                    "path": request.scope["path"],
                                    "headers": [
                                        (b"cookie", f"access_token={new_access_token}".encode()),
                                        *[(k, v) for k, v in request.scope.get("headers", []) 
                                          if k.lower() != b"cookie"]
                                    ],
                                    "method": request.scope["method"],
                                    "query_string": request.scope.get("query_string", b""),
                                    "http_version": request.scope.get("http_version", "1.1"),
                                    "server": request.scope.get("server", ("127.0.0.1", 8000)),
                                    "client": request.scope.get("client", ("127.0.0.1", 0)),
                                    "scheme": request.scope.get("scheme", "http"),
                                    "root_path": request.scope.get("root_path", ""),
                                    "app": request.app,
                                })
                                
                                # ✅ Exécuter la requête originale
                                response = await call_next(updated_request)
                                
                                # ✅ Ajouter les nouveaux cookies à la réponse
                                response.set_cookie(
                                    key="access_token",
                                    value=new_access_token,
                                    httponly=True,
                                    secure=COOKIE_SECURE,
                                    samesite=COOKIE_SAMESITE,
                                    max_age=30 * 60,  # 30 minutes
                                    path="/",
                                )
                                if new_refresh_token:
                                    response.set_cookie(
                                        key="refresh_token",
                                        value=new_refresh_token,
                                        httponly=True,
                                        secure=COOKIE_SECURE,
                                        samesite=COOKIE_SAMESITE,
                                        max_age=30 * 24 * 60 * 60,  # 30 jours
                                        path="/auth/refresh",
                                    )
                                
                                logger.info(f"✅ Token rafraîchi avec succès pour {request.url.path}")
                                return response
                        
                        # ✅ Refresh échoué → rediriger vers login
                        logger.warning(f"❌ Refresh token échoué pour {request.url.path}")
                        return self._redirect_to_login()
                        
                except Exception as e:
                    logger.error(f"Erreur lors du rafraîchissement: {e}")
                    return self._redirect_to_login()
        
        # ✅ Autre erreur → rediriger vers login
        return self._redirect_to_login()
    
    def _redirect_to_login(self):
        """Retourne une réponse qui redirige vers la page de login"""
        return JSONResponse(
            status_code=401,
            content={
                "detail": "Session expirée. Veuillez vous reconnecter.",
                "code": "token_expired",
                "redirect": "/login"
            },
            headers={
                "X-Session-Expired": "true",
                "X-Redirect": "/login"
            }
        )
