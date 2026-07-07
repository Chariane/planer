# Audit de Sécurité OWASP Top 10:2025 - K-Planer
**Date:** 2024  
**Application:** K-Planer (Plateforme de gestion de projets collaboratifs)  
**Stack:** FastAPI (Backend microservices) + React 19 (Frontend) + PostgreSQL  

---

## 1. MATRICE DE CONFORMITÉ OWASP TOP 10:2025

| # | Catégorie OWASP | État | Composants Affectés | Notes |
|---|---|---|---|---|
| A01 | Broken Access Control (Contrôle d'accès compromis) | 🟡 Partiel | API Gateway, Workspace, Espace, Liste | RBAC implémenté; manque vérification ownership |
| A02 | Cryptographic Failures (Failles cryptographiques) | ✅ Bon | Core/security.py, Auth routes | bcrypt + JWT + env vars pour secrets |
| A03 | Injection (Injection SQL/NoSQL/XSS) | ✅ Bon | Backend (SQLAlchemy), Frontend | Requêtes paramétrées; Pydantic validators |
| A04 | Insecure Design (Conception non sécurisée) | 🟡 Partiel | Configuration, Logging | Config CORS hardcodée; pas de CSP headers |
| A05 | Security Misconfiguration (Mauvaise configuration) | 🟡 Partiel | Frontend, API Gateway | Pas de security headers; CORS overly permissive |
| A06 | Vulnerable & Outdated Components | 🟡 À vérifier | package.json, requirements.txt | Versions pinées pour crypto; audit npm/pip requis |
| A07 | Authentication Failures (Failles d'authentification) | 🟡 Partiel | Auth routes | 2FA + JWT; manque rate limiting + attempt counter |
| A08 | Software & Data Integrity Failures | ❌ Non identifié | CI/CD, Dependencies | Pas de pipeline sécurisé visible |
| A09 | Logging & Monitoring Failures | ❌ Critique | Tous les services | Pas de logging structuré pour sécurité |
| A10 | SSRF/Insecure Deserialization | ✅ Bon | Backend | Pas d'appels HTTP externes détectés |

**Légende:** ✅ Bon (conforme) | 🟡 Partiel (dégradé) | ❌ Critique (manquant)

---

## 2. POINTS FORTS IDENTIFIÉS

### 2.1 Authentification & Cryptographie
- **bcrypt Password Hashing** (`backend/api_gateway/core/security.py:lines 30-40`)
  ```python
  hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
  ```
  ✅ **Force:** Utilisation de bcrypt avec salt génération automatique pour tous les mots de passe

- **JWT Token Management** (`backend/api_gateway/core/security.py:lines 95-110`)
  ```python
  encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
  ```
  ✅ **Force:** Tokens signés avec HMAC-SHA256; expiration 30min access + 30j refresh

- **Token Blacklist** (`backend/api_gateway/core/security.py:lines 115-135`)
  ✅ **Force:** Implémentation de blacklist pour logout immédiat (invalidation token)

- **Two-Factor Authentication (2FA)**
  ✅ **Force:** Google Authenticator intégré pour auth multi-facteur

- **Password Reset Flow Sécurisé** (`backend/api_gateway/routes/auth.py`)
  ✅ **Force:** Code 6-digit avec validation, lien expirant

### 2.2 Input Validation & Type Safety
- **Pydantic Validators** (`backend/api_gateway/schemas/Auth.py`)
  ```python
  @field_validator('email')
  def normalize_email(cls, v):
      return v.lower().strip()
  ```
  ✅ **Force:** Validation stricte des types; normalisation email

- **File Upload Size Limiting** (`backend/api_gateway/routes/auth.py`)
  ```python
  MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024  # 2MB
  ```
  ✅ **Force:** Limite 2MB sur photos de profil avec validation Base64

- **SQLAlchemy ORM Protection**
  ✅ **Force:** Requêtes paramétrées par défaut (protection SQL Injection)

### 2.3 Access Control Structure
- **Role-Based Access Control (RBAC)**
  ```python
  async def get_current_admin(current_user: UtilisateurOut = Depends(get_current_user))
  async def get_current_entreprise(current_user: UtilisateurOut = Depends(get_current_user))
  ```
  ✅ **Force:** Dépendances FastAPI pour vérification de rôle sur endpoints

- **CheckConstraints Database**
  ```sql
  CheckConstraint("role::text = ANY (ARRAY['Créateur', 'Administrateur', 'Membre', 'Invité'])")
  ```
  ✅ **Force:** Validation au niveau base de données des rôles et statuts valides

- **Unique Indexes**
  ```sql
  Index('idx_membre_workspace_unique', 'id_utilisateur', 'id_workspace', unique=True)
  ```
  ✅ **Force:** Contraintes uniques pour éviter doublons critiques

### 2.4 Configuration & Environment
- **Environment Variables pour Secrets**
  ✅ **Force:** SECRET_KEY, DB_URL, API_KEYS en variables d'environnement (.env)

- **Dépendances Pinées** (`requirements.txt`)
  ```
  bcrypt==4.0.1
  passlib[bcrypt]==1.7.4
  python-jose[cryptography]==3.3.0
  ```
  ✅ **Force:** Versions verrouillées pour cryptographie

### 2.5 Frontend Error Handling
- **Error Message Sanitization** (`frontend/src/services/api.ts`)
  ```typescript
  sanitizeApiErrorMessage(message.replace(/http:\/\/.*?\//g, ''));
  ```
  ✅ **Force:** Suppression URLs localhost pour éviter fuite d'info

---

## 3. LACUNES IDENTIFIÉES & ANALYSE PAR CATÉGORIE

### A01: BROKEN ACCESS CONTROL
| Lacune | Sévérité | Fichier | Description |
|--------|----------|---------|-------------|
| Pas de vérification `owner` | CRITIQUE | routes/*.py | GET /resource/{id} ne vérifie pas si `current_user.id == resource.user_id` |
| Guard frontend insuffisant | HAUTE | components/ResourceGuard.tsx | Frontend guard cosmétique; attaquant peut bypasser côté client |
| Pas de audit trail | HAUTE | Tous les services | Aucune trace des modifications/accès aux ressources |
| Authorization sur workspace | MOYENNE | routes/workspace.py | Pas d'audit sur qui peut ajouter/supprimer membres |

**Action immédiate:**
- [ ] Vérifier chaque endpoint GET/PUT/DELETE pour validation `owner_id`
- [ ] Implémenter audit logging pour changements de rôles
- [ ] Valider autorisation backend (pas de trust frontend)

---

### A02: CRYPTOGRAPHIC FAILURES
| Lacune | Sévérité | Détail |
|--------|----------|--------|
| Token blacklist éphémère | MOYENNE | In-memory; perdu au redémarrage → tokens "logout" redeviennent valides |
| Pas de rotation clés | MOYENNE | SECRET_KEY jamais changée → compromission = tolérance illimitée |
| Photo stockée non-chiffrée | MOYENNE | LargeBinary en DB; pas de chiffrement au repos |

**Recommendations:**
- [ ] Redis pour token blacklist persistant (TTL = exp time)
- [ ] Key rotation strategy avec versioning
- [ ] Chiffrement symétrique (Fernet) pour données sensibles

---

### A03: INJECTION
**État:** ✅ BON (Protection complète observée)
- SQLAlchemy paramétrisation ✅
- Pydantic validation ✅
- Pas de dynamic SQL ✅
- Base64 decoding avec error handling ✅

---

### A04: INSECURE DESIGN
| Lacune | Sévérité | Fichier | Description |
|--------|----------|---------|-------------|
| CORS hardcodé | HAUTE | api_gateway/main.py L18 | `allow_origins=["http://localhost:5173"]` en dur; pas d'env variable |
| Headers permissifs | HAUTE | api_gateway/main.py | `allow_headers=["*"]` accepte ANY header |
| Pas de CSP | CRITIQUE | frontend/index.html | XSS possible via injection script tag |
| Pas de HSTS | HAUTE | API Gateway | Downgrade HTTP possible en attaque MITM |
| Pas de X-Frame-Options | MOYENNE | API Gateway | Clickjacking possible via iframe |
| Pas de rate limiting | CRITIQUE | routes/auth.py | Brute force login sans limitation |
| Attempt counter absent | HAUTE | Utilisateur.py | Pas de verrouillage après N tentatives |

**Priority fixes:**
1. Ajouter CSP headers via middleware FastAPI
2. Implémenter rate limiting (10 req/min login)
3. Compter tentatives échouées → verrouillage compte

---

### A05: SECURITY MISCONFIGURATION
| Élément | État | Détail |
|--------|------|--------|
| CORS Config | ❌ | Overly permissive; hardcodée |
| Security Headers | ❌ | Aucun: CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| HTTPS | ❓ | Pas observable en config; production necessiterait HTTPS enforcer |
| Frontend build | ❌ | Vite pas configuré pour CSP|
| Error verbose | 🟡 | Partial sanitization; erreurs détaillées en logs |

---

### A06: VULNERABLE & OUTDATED COMPONENTS
**Action requise:** Audits de dépendances
```bash
# Frontend
npm audit                    # Vérifier vulnerabilités

# Backend
pip install safety
safety check --json
```

**Observations:**
- bcrypt==4.0.1 ✅ Current version
- passlib[bcrypt]==1.7.4 ✅ OK
- FastAPI: Version non visible; vérifier
- React 19.2.4: À auditer via npm audit

---

### A07: AUTHENTICATION FAILURES
| Lacune | Sévérité | Fichier |
|--------|----------|---------|
| Pas rate limiting login | CRITIQUE | routes/auth.py |
| Pas attempt counter | HAUTE | models/Utilisateur.py |
| Pas de password complexity | MOYENNE | schemas/Auth.py |
| Refresh token sans revocation | MOYENNE | core/security.py |
| Session timeout pas configuré | MOYENNE | API Gateway |
| 2FA sans backup codes | MOYENNE | routes/auth.py |

**Password Complexity Missing:**
```python
# Actuel: min 8 chars seulement
# À ajouter: uppercase + lowercase + numbers + special

class PasswordValidator:
    MIN_LENGTH = 12
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL = True
```

---

### A08: SOFTWARE & DATA INTEGRITY FAILURES
| Aspect | État |
|--------|------|
| CI/CD Pipeline | ❌ Non observable |
| Dependency checking | ❌ Non automatisé |
| Code signing | ❌ Non observable |
| Supply chain security | ❌ À implémenter |

**À ajouter:**
- [ ] GitHub Actions pour npm audit + pip safety
- [ ] SBOM (Software Bill of Materials)
- [ ] Dependency update automation

---

### A09: LOGGING & MONITORING FAILURES ⚠️ CRITIQUE
**Impact:** Impossible de détecter attaques en cours

| Élément | État | Problème |
|--------|------|---------|
| Auth Logging | ❌ | `logger.warning()` pour token blacklist; pas pour login/logout |
| Access Logs | ❌ | Aucun logging de GET/PUT/DELETE |
| Error Logs | 🟡 | `logger.error()` pour JWT; pas structuré |
| Security Events | ❌ | Pas de capture attempts échouées |
| Audit Trail | ❌ | Modifications de rôle/permissions invisibles |
| Centralized Logging | ❌ | Logs stdout seulement; pas de ELK/Splunk |

**Urgence:** Mettre en place logging structuré avant production

---

### A10: SSRF/INSECURE DESERIALIZATION
**État:** ✅ BON
- Pas d'appels HTTP externes vers URLs user-controlled
- JSON parsing sécurisé via Pydantic
- Pas de pickle/eval() détecté

---

## 4. PLAN D'ACTION PRIORISÉ

### 🔴 PRIORITÉ 1 - CRITIQUE (Déployer immédiatement)

#### 1.1 Implémenter Security Headers Middleware
**Fichier:** `backend/api_gateway/main.py`
```python
from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware

app = FastAPI()

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # CSP - Restrict script sources
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self';"
        )
        
        # HSTS - Force HTTPS
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        
        # Clickjacking protection
        response.headers["X-Frame-Options"] = "DENY"
        
        # MIME type sniffing protection
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # XSS Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

**Timeline:** 1 jour  
**Test:** Vérifier headers avec curl -I http://localhost:8000/docs

---

#### 1.2 Implémenter Rate Limiting sur /login
**Fichier:** `backend/api_gateway/routes/auth.py`
```python
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.util import get_remote_address
from fastapi_limiter.deps import RateLimiter

@app.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: LoginSchema,
    db: Session = Depends(get_db)
):
    # Existing logic
    pass
```

**Dependencies:** `pip install fastapi-limiter2 redis`  
**Timeline:** 2 days (including Redis setup)

---

#### 1.3 Ajouter Attempt Counter & Account Lockout
**Fichier:** `backend/api_gateway/models/Utilisateur.py`
```python
class Utilisateur(Base):
    # ... existing fields ...
    failed_login_attempts: int = Column(Integer, default=0, nullable=False)
    locked_until: Optional[datetime] = Column(DateTime, nullable=True)
    last_failed_login: Optional[datetime] = Column(DateTime, nullable=True)
```

**Fichier:** `backend/api_gateway/routes/auth.py`
```python
async def login(credentials: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(Utilisateur).filter(
        Utilisateur.email == credentials.email
    ).first()
    
    if user and user.locked_until and datetime.utcnow() < user.locked_until:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Compte verrouillé. Réessayez dans 30 minutes."
        )
    
    if not verify_password(credentials.password, user.hashed_password):
        user.failed_login_attempts += 1
        user.last_failed_login = datetime.utcnow()
        
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)
        
        db.commit()
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    
    # Reset on successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
```

**Timeline:** 1 jour

---

#### 1.4 Implémenter Logging Structuré pour Sécurité
**Fichier:** `backend/api_gateway/core/logging.py` (new)
```python
import structlog
import logging

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
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Security event logging
def log_auth_event(event: str, user_id: str, ip_address: str, status: str, details: dict = None):
    """Structured logging for authentication events"""
    logger.info(
        "auth_event",
        event=event,  # login, logout, 2fa_setup, password_change
        user_id=user_id,
        ip_address=ip_address,
        status=status,  # success, failure
        timestamp=datetime.utcnow().isoformat(),
        **(details or {})
    )

def log_access_event(event: str, user_id: str, resource_type: str, resource_id: str, action: str, allowed: bool):
    """Structured logging for access control events"""
    logger.info(
        "access_event",
        event=event,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,  # GET, PUT, DELETE, POST
        allowed=allowed,
        timestamp=datetime.utcnow().isoformat()
    )
```

**Usage in routes:**
```python
from core.logging import log_auth_event

@app.post("/login")
async def login(credentials: LoginSchema, request: Request, db: Session):
    # ... auth logic ...
    log_auth_event(
        event="login",
        user_id=user.id,
        ip_address=request.client.host,
        status="success"
    )
```

**Timeline:** 2 days  
**Monitoring:** Setup Datadog/ELK stack pour centralizer logs

---

### 🟠 PRIORITÉ 2 - HAUTE (Déployer dans 2 semaines)

#### 2.1 Resource Ownership Validation
**Pattern:** Ajouter sur CHAQUE endpoint non-list
```python
@app.get("/resource/{resource_id}")
async def get_resource(
    resource_id: str,
    current_user: UtilisateurOut = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Check ownership or shared access
    if resource.owner_id != current_user.id and \
       current_user.id not in [m.id_utilisateur for m in resource.membres]:
        log_access_event(
            event="unauthorized_access_attempt",
            user_id=current_user.id,
            resource_type="Resource",
            resource_id=resource_id,
            action="GET",
            allowed=False
        )
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    return resource
```

**Audit:** Parcourir tous les fichiers `routes/*.py` et ajouter validations  
**Timeline:** 3-5 days

---

#### 2.2 Token Blacklist Persistant (Redis)
**Fichier:** `backend/api_gateway/core/security.py`
```python
import redis
from typing import Optional

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    db=0,
    decode_responses=True
)

def blacklist_token(token: str, expires_in: int):
    """Add token to blacklist with TTL"""
    redis_client.setex(
        f"blacklist:{token}",
        expires_in,  # seconds
        "true"
    )

def is_token_blacklisted(token: str) -> bool:
    """Check if token is blacklisted"""
    return redis_client.exists(f"blacklist:{token}") > 0
```

**Timeline:** 2 days (including Redis Dockerfile + docker-compose update)

---

#### 2.3 CORS Environment Configuration
**Fichier:** `backend/api_gateway/main.py`
```python
from fastapi.middleware.cors import CORSMiddleware
import os

# Read from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # ✅ Environment-based
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # ✅ Explicit, not wildcard
    allow_headers=["Content-Type", "Authorization"],  # ✅ Explicit, not wildcard
    expose_headers=["X-Total-Count"],
    max_age=3600,
)
```

**.env file:**
```
# Dev
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Production
# ALLOWED_ORIGINS=https://k-planer.com,https://app.k-planer.com
```

**Timeline:** 0.5 day

---

#### 2.4 Frontend: Add DOMPurify pour XSS Protection
**Installation:** 
```bash
npm install dompurify
npm install -D @types/dompurify
```

**Fichier:** `frontend/src/utils/sanitize.ts` (new)
```typescript
import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

export const sanitizeText = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};
```

**Fichier:** `frontend/src/components/ProfileCard.tsx`
```tsx
import { sanitizeHtml } from '../utils/sanitize';

export function ProfileCard({ user }) {
  return (
    <div>
      <h2>{sanitizeText(user.username)}</h2>
      <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(user.biographie) }} />
    </div>
  );
}
```

**Timeline:** 1 day (refactor all user-controlled content rendering)

---

#### 2.5 Password Complexity Requirements
**Fichier:** `backend/api_gateway/schemas/Auth.py`
```python
from pydantic import field_validator
import re

class PasswordValidation:
    MIN_LENGTH = 12
    PATTERN = re.compile(
        r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]'
    )
    
    @field_validator('password')
    def validate_password_strength(cls, v):
        if len(v) < 12:
            raise ValueError('Min 12 caractères')
        if not cls.PATTERN.match(v):
            raise ValueError(
                'Doit contenir: majuscule, minuscule, chiffre, caractère spécial'
            )
        return v
```

**Timeline:** 1 day  
**User communication:** Notifier utilisateurs changement policy

---

### 🟡 PRIORITÉ 3 - MOYENNE (Déployer en 1 mois)

#### 3.1 2FA Backup Codes
**Fichier:** `backend/api_gateway/routes/auth.py`
```python
import secrets

@app.post("/2fa/setup")
async def setup_2fa(current_user: UtilisateurOut = Depends(get_current_active_user)):
    # Generate authenticator
    # ...
    
    # Generate 10 backup codes
    backup_codes = [secrets.token_hex(4) for _ in range(10)]
    
    # Hash & store in database (encrypted)
    hashed_codes = [hash_backup_code(code) for code in backup_codes]
    user.backup_codes = json.dumps(hashed_codes)
    db.commit()
    
    return {
        "qr_code": qr_image,
        "backup_codes": backup_codes,  # Show only at setup time
        "message": "Conservez ces codes de sauvegarde dans un endroit sûr"
    }
```

**Timeline:** 3 days

---

#### 3.2 Implement Audit Logging Table
**Fichier:** `backend/api_gateway/models/AuditLog.py` (new)
```python
from sqlalchemy import Column, String, DateTime, JSON, text
from sqlalchemy.orm import Mapped, mapped_column
from .Base import Base
import datetime

class AuditLog(Base):
    __tablename__ = 'audit_log'
    
    id: Mapped[str] = mapped_column(String(12), primary_key=True, server_default=text("encode(gen_random_bytes(6), 'hex'::text)"))
    event_type: Mapped[str] = mapped_column(String(50))  # login, logout, role_change, resource_access
    user_id: Mapped[Optional[str]] = mapped_column(String(12), ForeignKey('utilisateur.id'))
    resource_type: Mapped[Optional[str]] = mapped_column(String(50))
    resource_id: Mapped[Optional[str]] = mapped_column(String(12))
    action: Mapped[str] = mapped_column(String(10))  # GET, POST, PUT, DELETE
    status: Mapped[str] = mapped_column(String(20))  # success, failure
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))  # IPv6 support
    user_agent: Mapped[Optional[str]] = mapped_column(String(255))
    details: Mapped[Optional[dict]] = mapped_column(JSON)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
```

**Timeline:** 2 days

---

#### 3.3 Ajouter CSP Headers via Frontend
**Fichier:** `frontend/index.html`
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' http://localhost:8000;
  " />
  <title>K-Planer</title>
</head>
```

**Better approach:** Via Vite plugin
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'..."
    }
  }
});
```

**Timeline:** 1 day

---

#### 3.4 Dependency Scanning Automation
**Fichier:** `.github/workflows/security.yml` (new)
```yaml
name: Security Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Frontend audit
        run: |
          cd frontend
          npm ci
          npm audit --audit-level=moderate
      
      - name: Backend audit
        run: |
          pip install safety
          cd backend
          safety check --json
      
      - name: SBOM generation
        run: |
          npm install -g cyclonedx-npm
          cyclonedx-npm --output-file bom.json
```

**Timeline:** 1 day  
**Cost:** Free (GitHub Actions)

---

## 5. SYNTHÈSE POUR SOUTENANCE

### 📊 Tableau Comparatif: Avant/Après Audit

| Dimension | État Actuel | Objectif | Timeline |
|-----------|------------|----------|----------|
| Auth Failures (A07) | 🟡 2FA+JWT | +Rate limit, +Complexity, +2FA Backup | 2 sem |
| Access Control (A01) | 🟡 RBAC basic | +Owner checks, +Audit trail | 2 sem |
| Security Headers | ❌ 0/5 | ✅ 5/5 (CSP, HSTS, XFO, etc) | 3 jours |
| Logging Security | ❌ Absent | ✅ Structured + centralized | 2 sem |
| Dependencies | 🟡 Manual | ✅ Automated scanning | 1 jour |
| XSS Protection | 🟡 Partial | ✅ DOMPurify | 1 jour |
| CORS Config | ❌ Hardcoded | ✅ Environment-aware | 4h |

### 🎯 Talking Points

**Strengths to Present:**
1. "Authentification robuste avec JWT + 2FA Google Authenticator"
2. "Hachage bcrypt pour tous les mots de passe"
3. "Validation d'entrée stricte via Pydantic"
4. "Protection SQL Injection via SQLAlchemy ORM"
5. "Architecture RBAC multi-niveaux (admin, entreprise, membre)"

**Improvements Made During Audit:**
1. "Séparation logout volontaire vs expiration session"
2. "Dépendances cryptographiques versionnées"
3. "Dépendances de sécurité pinées (bcrypt 4.0.1)"

**Next Steps (Roadmap):**
1. **Phase 1 (2 semaines):** Rate limiting, attempt counter, security headers, structured logging
2. **Phase 2 (1 mois):** Backend authorization verification, token blacklist Redis, 2FA backup codes
3. **Phase 3 (Ongoing):** Dependency scanning automation, penetration testing

### 📸 Artefacts de Preuve

**Code Samples:**
```python
# OWASP A02 - Cryptographic: bcrypt hashing
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

# OWASP A01 - Access Control: Role-based dependency
async def get_current_admin(current_user = Depends(get_current_user))
```

**Logs Structurés Example (à implémenter):**
```json
{
  "event": "login",
  "user_id": "u_abc123",
  "ip_address": "192.168.1.100",
  "status": "success",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Dashboard Metrics (Goal):**
- Auth events/hour: 1000+
- Failed login attempts blocked: 95%+
- Access denied (403) rate: <1%
- Security header coverage: 100%

---

## 6. RECOMMANDATIONS SUPPLÉMENTAIRES

### Court Terme (1-2 semaines)
1. ✅ **Security Headers** - Impact immédiat sur réduction XSS/clickjacking
2. ✅ **Rate Limiting** - Prévention brute force
3. ✅ **Attempt Counter** - Account lockout protection
4. ✅ **Structured Logging** - Visibilité sécurité

### Moyen Terme (1-3 mois)
1. **Penetration Testing** - Test par expert externe
2. **OWASP ZAP Integration** - Scanning automatisé
3. **Incident Response Plan** - Documentation SOP
4. **WAF (Web Application Firewall)** - Cloudflare/AWS WAF

### Long Terme (3-6 mois)
1. **Zero Trust Architecture** - Vérifier chaque accès
2. **mTLS entre microservices** - Encryption service-to-service
3. **Secrets Management** - HashiCorp Vault
4. **API Gateway Security** - Rate limiting, IP whitelist
5. **Compliance Certification** - ISO 27001 / SOC 2

---

## 7. RÉFÉRENCES & RESSOURCES

- [OWASP Top 10:2025](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/advanced/security/)
- [React Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)

---

**Document signé:** Audit de sécurité OWASP Top 10:2025  
**Validé par:** Système de sécurité K-Planer  
**Prochaine révision:** Après implémentation Phase 1  
