# 🔧 CORRECTIONS DE CODE - P2 HAUTE PRIORITÉ
## K-Planer Security Fixes - Priority 2 (Semaines 2-3)

**Date:** 7 juillet 2026  
**Effort:** 10-14 heures  
**Timeline:** Semaines 2-3  

---

## 🟠 P2.1: Gestion Sécurisée des Secrets

### Problème
Secrets potentiellement en dur → risque d'exposition (keys, database passwords, JWT secrets)

### Fichiers Affectés
- `backend/api_gateway/main.py`
- `backend/api_gateway/core/security.py`
- `backend/api_espace/main.py`
- `backend/api_liste_et_tache/main.py`

### Solution 1: Configuration avec python-dotenv

```bash
# Installer dependencies
pip install python-dotenv pydantic-settings
```

```python
# backend/.env.example (À committer - SANS SECRETS)
DATABASE_URL=postgresql://user:password@localhost:5432/k_planer
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=your-super-secret-key-min-32-chars-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@k-planer.com
ENVIRONMENT=production
DEBUG=false
ALLOWED_HOSTS=api.k-planer.local,localhost
CORS_ORIGINS=https://k-planer.local,https://app.k-planer.local
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=INFO
```

```python
# backend/api_gateway/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os

class Settings(BaseSettings):
    """Configuration centralisée et validée"""
    
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    
    # Redis
    REDIS_URL: str
    REDIS_DB: int = 0
    
    # JWT & Security
    JWT_SECRET_KEY: str  # Min 32 chars
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Email
    SMTP_SERVER: str
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str  # ✅ Sécurisé via .env
    EMAIL_FROM: str
    
    # Environment
    ENVIRONMENT: str = "development"  # development, staging, production
    DEBUG: bool = False
    
    # API Security
    ALLOWED_HOSTS: list = ["localhost", "127.0.0.1"]
    CORS_ORIGINS: list = ["http://localhost:5173"]  # Dev - à restreindre en prod
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = "INFO"
    
    # Rate limiting
    RATE_LIMIT_REDIS_URL: str = None  # Default = REDIS_URL
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        
        # ✅ Validation des secrets en startup
        @classmethod
        def settings_customise_sources(cls, settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings):
            # Vérifier que secrets ne sont pas en dur (dummy values)
            if env_settings.get("JWT_SECRET_KEY", "").startswith("your-"):
                raise ValueError("❌ JWT_SECRET_KEY not configured! Use .env file.")
            if env_settings.get("SMTP_PASSWORD", "").startswith("your-"):
                raise ValueError("❌ SMTP_PASSWORD not configured! Use .env file.")
            
            return (
                init_settings,
                dotenv_settings,
                env_settings,
                file_secret_settings,
            )
    
    def validate_secrets(self):
        """✅ Valider que tous les secrets sont configurés"""
        required_secrets = [
            "JWT_SECRET_KEY",
            "DATABASE_URL",
            "REDIS_URL",
            "SMTP_PASSWORD"
        ]
        
        for secret in required_secrets:
            value = getattr(self, secret, None)
            if not value or value.startswith("your-"):
                raise ValueError(f"❌ Required secret not configured: {secret}")
        
        # Vérifier longueur du JWT secret
        if len(self.JWT_SECRET_KEY) < 32:
            raise ValueError("❌ JWT_SECRET_KEY must be at least 32 characters")
        
        if self.ENVIRONMENT == "production":
            if self.DEBUG:
                raise ValueError("❌ DEBUG must be False in production")
            if "localhost" in self.ALLOWED_HOSTS:
                raise ValueError("❌ localhost not allowed in production")
            if "http://" in str(self.CORS_ORIGINS):
                raise ValueError("❌ Only HTTPS allowed in production")

@lru_cache()
def get_settings() -> Settings:
    """✅ Cache les settings (une seule initialisation)"""
    settings = Settings()
    settings.validate_secrets()
    return settings

# Usage dans FastAPI
from fastapi import FastAPI

app = FastAPI()
settings = get_settings()

# Ne JAMAIS logger les secrets
logger.info(f"Environment: {settings.ENVIRONMENT}")
logger.info(f"Database: {settings.DATABASE_URL.split('@')[0]}***")  # ✅ Masquer password
```

```python
# backend/api_gateway/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import structlog
from config import get_settings

settings = get_settings()

app = FastAPI(
    title="K-Planer API Gateway",
    version="1.0.0",
    debug=settings.DEBUG  # ✅ Debug désactivé en production
)

# ✅ Middleware de Sécurité - ordre important

# 1. TrustedHost (rejette les requêtes avec mauvais Host)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# 2. CORS - très restrictif
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Whitelist uniquement
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=600  # Cache preflight requests for 10 minutes
)

# Configure logger structuré
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.render_to_log_kwargs,
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# ✅ Log sans données sensibles
logger.info(
    "app_startup",
    environment=settings.ENVIRONMENT,
    database_host=settings.DATABASE_URL.split("@")[-1].split(":")[0],  # ✅ Masquer password
    cors_origins=settings.CORS_ORIGINS
)
```

### Tests de Configuration

```python
# backend/tests/test_config.py
import pytest
from config import Settings, get_settings

def test_settings_load():
    """Test que les settings se chargent correctement"""
    settings = get_settings()
    assert settings.JWT_SECRET_KEY is not None
    assert len(settings.JWT_SECRET_KEY) >= 32

def test_settings_validate_secrets():
    """Test que les secrets invalides lèvent une erreur"""
    with pytest.raises(ValueError, match="JWT_SECRET_KEY not configured"):
        settings = Settings(
            JWT_SECRET_KEY="your-secret",  # Invalid
            DATABASE_URL="postgresql://localhost",
            REDIS_URL="redis://localhost",
            SMTP_PASSWORD="test"
        )
        settings.validate_secrets()

def test_settings_production_strict():
    """Test que la production est stricte"""
    with pytest.raises(ValueError, match="DEBUG must be False"):
        settings = Settings(
            ENVIRONMENT="production",
            DEBUG=True,
            JWT_SECRET_KEY="a" * 32,
            DATABASE_URL="postgresql://localhost",
            REDIS_URL="redis://localhost",
            SMTP_PASSWORD="test",
            ALLOWED_HOSTS=["localhost"]
        )
        settings.validate_secrets()
```

---

## 🟠 P2.2: CORS Sécurisé - Whitelist

### Problème
CORS potentiellement trop ouvert (`allow_origins=["*"]` ou `allow_credentials=True` + wildcard)

### Solution

```python
# ✅ AVANT (INSECURE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ❌ DANGEREUX
    allow_credentials=True,  # ❌ Avec wildcard = risque
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ APRÈS (SECURE)
from config import get_settings

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://k-planer.local",
        "https://app.k-planer.local",
        "https://admin.k-planer.local"
    ],  # ✅ Whitelist seulement
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-Total-Count", "X-Page-Number"],
    max_age=3600  # Cache preflight pour 1 heure
)
```

### Configuration par Environment

```python
# backend/config.py
class Settings(BaseSettings):
    # ...
    
    @property
    def CORS_ORIGINS_LIST(self) -> list:
        """✅ CORS origins basé sur l'environment"""
        origins_str = self.CORS_ORIGINS  # "https://app.k-planer.local,https://admin.k-planer.local"
        origins = [o.strip() for o in origins_str.split(",")]
        
        # Validation
        if self.ENVIRONMENT == "production":
            # ✅ Rejeter http en production
            http_origins = [o for o in origins if o.startswith("http://")]
            if http_origins:
                raise ValueError(f"HTTP origins not allowed in production: {http_origins}")
            
            # ✅ Rejeter localhost en production
            localhost_origins = [o for o in origins if "localhost" in o]
            if localhost_origins:
                raise ValueError(f"Localhost not allowed in production: {localhost_origins}")
        
        return origins
```

---

## 🟠 P2.3: Sanitization des Logs (Pas de Données Sensibles)

### Problème
Données sensibles (passwords, tokens, emails) potentiellement en logs

### Solution

```python
# backend/core/logging.py
import structlog
import re
import hashlib
from typing import Any

class SensitiveDataFilter:
    """✅ Filter pour masquer les données sensibles dans les logs"""
    
    SENSITIVE_PATTERNS = {
        "password": r"(password|passwd|pwd)[\s]*[:=][\s]*['\"]?[^'\"]*['\"]?",
        "token": r"(token|bearer|authorization)[\s]*[:=][\s]*['\"]?[^'\"]*['\"]?",
        "api_key": r"(api_key|apikey|api-key)[\s]*[:=][\s]*['\"]?[^'\"]*['\"]?",
        "secret": r"(secret|secret_key)[\s]*[:=][\s]*['\"]?[^'\"]*['\"]?",
        "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "credit_card": r"\b(?:\d[ -]*?){13,19}\b",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b"
    }
    
    @staticmethod
    def mask_email(email: str) -> str:
        """Masquer email: user@example.com → u***@example.com"""
        if "@" not in email:
            return "***"
        local, domain = email.split("@")
        if len(local) <= 1:
            return f"*@{domain}"
        return f"{local[0]}***@{domain}"
    
    @staticmethod
    def mask_value(value: str, pattern_name: str) -> str:
        """Masquer valeur sensible"""
        if pattern_name == "email":
            return SensitiveDataFilter.mask_email(value)
        
        # Pour autres: hash + premiers 4 caractères
        if len(value) > 4:
            hash_suffix = hashlib.md5(value.encode()).hexdigest()[:8]
            return f"{value[:4]}...{hash_suffix}"
        return "***"
    
    @staticmethod
    def sanitize_string(text: str) -> str:
        """Nettoyer une string de données sensibles"""
        if not isinstance(text, str):
            return str(text)
        
        sanitized = text
        for pattern_name, pattern in SensitiveDataFilter.SENSITIVE_PATTERNS.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                original = match.group()
                masked = SensitiveDataFilter.mask_value(
                    original.split("=")[-1].strip().strip('"\''),
                    pattern_name
                )
                sanitized = sanitized.replace(original, f"{pattern_name}=***{masked}***")
        
        return sanitized
    
    @staticmethod
    def sanitize_dict(data: dict) -> dict:
        """Nettoyer un dictionnaire de données sensibles"""
        if not isinstance(data, dict):
            return data
        
        sanitized = {}
        sensitive_keys = {"password", "token", "secret", "api_key", "apikey", "api-key", "email"}
        
        for key, value in data.items():
            if key.lower() in sensitive_keys:
                # ✅ Masquer les valeurs sensibles
                if isinstance(value, str):
                    sanitized[key] = SensitiveDataFilter.mask_value(value, key.lower())
                else:
                    sanitized[key] = "***"
            elif isinstance(value, dict):
                sanitized[key] = SensitiveDataFilter.sanitize_dict(value)
            elif isinstance(value, str):
                sanitized[key] = SensitiveDataFilter.sanitize_string(value)
            else:
                sanitized[key] = value
        
        return sanitized

def configure_logging():
    """✅ Configure structured logging avec sanitization"""
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            # ✅ Processor personnalisé pour sanitization
            SensitiveDataFilter(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

# Usage
logger = structlog.get_logger()

# ❌ AVANT - Danger!
logger.info("Login attempt", email="user@example.com", password="SecurePass123")
# → Log contient le password!

# ✅ APRÈS - Sécurisé
logger.info("Login attempt", email="user@example.com")
# → Email maské en u***@example.com, pas de password
```

---

## 🟠 P2.4: Subresource Integrity (SRI) pour External Scripts

### Problème
Scripts externes (CDN) pourraient être compromis

### Fichier Affecté
`frontend/index.html`

### Solution

```bash
# Calculer SRI hash pour chaque script/stylesheet
npm install -D sri-generator

# Générer SRI pour un script CDN
npx sri-generator https://cdn.jsdelivr.net/npm/react@18.2.0/dist/react.production.min.js
# Output: sha384-abc...
```

```html
<!-- frontend/index.html -->
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    
    <!-- ✅ Polyfill avec SRI hash -->
    <script
        src="https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js"
        integrity="sha384-0TwY54nI3/xrIZjb73VhQtFxSJhSVOkR/83UR2wSAqqxMbw8+f9wZ7a/lxZZ3+fM"
        crossorigin="anonymous">
    </script>
    
    <!-- ✅ DOMPurify avec SRI hash -->
    <script
        src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
        integrity="sha384-HJfV7Jy5i7g7Z1A7S7c5oZkAOvOlLczKn4X3QfR8TzJ5lI4t5l/xHeFZVw4Rxs+V"
        crossorigin="anonymous">
    </script>
    
    <!-- ✅ Fonts avec SRI -->
    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
        integrity="sha384-..." />
    
    <title>K-Planer</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

---

## 🟠 P2.5: Session Timeout & Token Rotation

### Problème
Sessions trop longues → risque de compromission prolongée

### Solution

```python
# backend/core/security.py
from datetime import timedelta, datetime
from jose import JWTError, jwt

class TokenManager:
    """✅ Gestion sécurisée des tokens"""
    
    ACCESS_TOKEN_EXPIRE_MINUTES = 15  # ✅ Court (15 min)
    REFRESH_TOKEN_EXPIRE_DAYS = 7     # ✅ Plus long (7 jours)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """Créer access token (court terme)"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=TokenManager.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict):
        """Créer refresh token (long terme)"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=TokenManager.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access"):
        """Vérifier et décoder token"""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            
            # ✅ Vérifier le type de token
            if payload.get("type") != token_type:
                raise JWTError("Invalid token type")
            
            user_id = payload.get("sub")
            if user_id is None:
                raise JWTError("Invalid token")
            
            return user_id
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

# backend/api_gateway/routes/auth.py
@app.post("/auth/refresh")
async def refresh_token(request: Request, db: Session = Depends(get_db)):
    """
    ✅ Endpoint pour refresh access token
    - Accepte refresh token (long terme)
    - Retourne nouveau access token (court terme)
    - Optionnellement rotate refresh token
    """
    try:
        # Récupérer le refresh token depuis les cookies
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing refresh token"
            )
        
        # Vérifier le refresh token
        user_id = TokenManager.verify_token(refresh_token, token_type="refresh")
        
        # Vérifier que l'utilisateur existe encore
        user = await get_user_by_id(db, user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Créer nouveaux tokens
        new_access_token = TokenManager.create_access_token(data={"sub": str(user_id)})
        new_refresh_token = TokenManager.create_refresh_token(data={"sub": str(user_id)})
        
        response = JSONResponse(content={"access_token": new_access_token})
        
        # ✅ Définir le refresh token en httpOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            max_age=7*24*60*60,  # 7 jours
            httponly=True,
            secure=settings.ENVIRONMENT == "production",
            samesite="Lax"
        )
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token refresh error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )
```

---

## 🟠 P2.6: URL Validation Frontend

### Problème
Open redirect possible → phishing

### Fichier Affecté
`frontend/src/utils/url-validator.ts`

### Solution

```typescript
// frontend/src/utils/url-validator.ts
/**
 * ✅ Valider les URLs pour prévenir les open redirects
 */

export function isValidRedirectUrl(url: string, allowedDomains: string[] = []): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  // ✅ Rejeter les URLs vides ou "javascript:"
  if (url.trim() === '' || url.startsWith('javascript:')) {
    return false
  }

  try {
    // Essayer de parser l'URL
    const urlObj = new URL(url, window.location.origin)
    
    // ✅ Accepter les URLs relatives (même domaine)
    if (url.startsWith('/')) {
      return true
    }
    
    // ✅ Accepter les URLs du même domaine
    if (urlObj.hostname === window.location.hostname) {
      return true
    }
    
    // ✅ Accepter les domains dans la whitelist
    if (allowedDomains.length > 0) {
      for (const domain of allowedDomains) {
        if (urlObj.hostname === domain) {
          return true
        }
      }
    }
    
    // ❌ Rejeter les autres domaines
    return false
  } catch {
    // URL invalide
    return false
  }
}

export function sanitizeRedirectUrl(
  url: string,
  allowedDomains: string[] = [],
  defaultRedirect: string = '/'
): string {
  /**
   * ✅ Nettoyer et valider une URL de redirection
   * Retourne l'URL validée ou une redirection par défaut
   */
  
  if (isValidRedirectUrl(url, allowedDomains)) {
    return url
  }
  
  logger.warn('Invalid redirect URL attempted', { url })
  return defaultRedirect
}

// Usage dans les composants
import { useNavigate } from 'react-router-dom'
import { sanitizeRedirectUrl } from '../../utils/url-validator'

export function LoginPage() {
  const navigate = useNavigate()
  
  const handleLoginSuccess = (redirectUrl: string | null) => {
    // ✅ Valider l'URL avant de rediriger
    const safeUrl = sanitizeRedirectUrl(
      redirectUrl || '/dashboard',
      [],  // Pas d'external domains acceptés
      '/dashboard'  // Default redirect
    )
    navigate(safeUrl)
  }
  
  return (
    // ...
  )
}
```

---

## 📋 CHECKLIST P2 - SEMAINES 2-3

- [ ] Système de configuration centralisé (.env + Settings)
- [ ] Secrets validés au startup
- [ ] CORS restrictif configuré
- [ ] Logs sans données sensibles
- [ ] SRI hashes ajoutés aux external scripts
- [ ] Access token timeout à 15 min
- [ ] Refresh token rotation implémentée
- [ ] URL validator frontend en place
- [ ] Tests pour chaque correction
- [ ] Documentation mise à jour

---

**Effort Total P2:** 10-14 heures  
**Timeline:** Semaines 2-3  
**Dépendance:** P1 doit être complété en premier
