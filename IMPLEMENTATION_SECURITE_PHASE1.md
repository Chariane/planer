# Plan d'Implémentation Sécurité - K-Planer
## Pour la Soutenance & Déploiement Phase 1

---

## 1️⃣ RAPIDE WIN: Security Headers (1 jour)

### Code à ajouter dans `backend/api_gateway/main.py`

```python
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import os

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # 🔒 Content-Security-Policy - Bloque XSS
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'"
        )
        
        # 🔒 HSTS - Force HTTPS
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        
        # 🔒 X-Frame-Options - Anti-clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # 🔒 X-Content-Type-Options - Empêche MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # 🔒 X-XSS-Protection - XSS Protection (ancienne version)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # 🔒 Referrer-Policy - Limite fuite info
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # 🔒 Permissions-Policy - Contrôle accès features
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=()"
        )
        
        return response

# ✅ Ajouter le middleware au démarrage
app = FastAPI()
app.add_middleware(SecurityHeadersMiddleware)
```

### Test:
```bash
# Avant
curl -i http://localhost:8000/docs | grep -E "Content-Security|Strict-Transport"

# Après (devrait voir les headers)
curl -i http://localhost:8000/docs
```

---

## 2️⃣ CRITIQUE: Rate Limiting + Attempt Counter (2 jours)

### A. Installation
```bash
cd backend/api_gateway
pip install fastapi-limiter2 redis aioredis
```

### B. Setup Rate Limiter dans `backend/api_gateway/core/security.py`

```python
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.util import get_remote_address
from redis.asyncio import Redis
import os

async def init_limiter():
    """Initialize rate limiter with Redis"""
    redis = Redis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379"),
        encoding="utf8",
        decode_responses=True
    )
    await FastAPILimiter.init(redis)

# Cleanup on shutdown
async def close_limiter():
    await FastAPILimiter.close()
```

### C. Configuration dans `backend/api_gateway/main.py`

```python
from contextlib import asynccontextmanager
from fastapi_limiter.util import get_remote_address
from fastapi_limiter import FastAPILimiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_limiter()
    yield
    # Shutdown
    await close_limiter()

app = FastAPI(lifespan=lifespan)
```

### D. Ajouter Rate Limiting à `/login`

**Fichier:** `backend/api_gateway/routes/auth.py`

```python
from fastapi_limiter.depends import RateLimiter
from fastapi import Request

@router.post("/login")
@limiter.limit("5/minute")  # Max 5 tentatives/minute
async def login(
    credentials: LoginSchema,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(Utilisateur).filter(
        Utilisateur.email == credentials.email
    ).first()
    
    if not user:
        log_auth_event(
            event="login",
            user_id="unknown",
            ip_address=request.client.host,
            status="failure",
            reason="user_not_found"
        )
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    
    # Check if account is locked
    if user.locked_until and datetime.utcnow() < user.locked_until:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Compte temporairement verrouillé. Réessayez dans 30 minutes."
        )
    
    # Verify password
    if not bcrypt.checkpw(credentials.password.encode(), user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        user.last_failed_login = datetime.utcnow()
        
        # Lock account after 5 failed attempts
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)
            db.commit()
            
            log_auth_event(
                event="login_account_locked",
                user_id=user.id,
                ip_address=request.client.host,
                status="failure",
                reason="too_many_attempts"
            )
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop de tentatives. Compte verrouillé."
            )
        
        db.commit()
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    
    # ✅ Login successful - reset counters
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()
    
    log_auth_event(
        event="login",
        user_id=user.id,
        ip_address=request.client.host,
        status="success"
    )
    
    # Generate tokens...
    return {"access_token": access_token, "token_type": "bearer"}
```

### E. Update Model

**Fichier:** `backend/api_gateway/models/Utilisateur.py`

```python
from datetime import datetime
from sqlalchemy import Integer, DateTime

class Utilisateur(Base):
    # ... existing fields ...
    
    # Security fields
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Nombre de tentatives échouées"
    )
    locked_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Compte verrouillé jusqu'à cette date"
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Dernière connexion réussie"
    )
    last_failed_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="Dernière tentative échouée"
    )
```

### F. Database Migration

```sql
-- migration_add_security_fields.sql
ALTER TABLE utilisateur ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE utilisateur ADD COLUMN locked_until TIMESTAMP NULL;
ALTER TABLE utilisateur ADD COLUMN last_login TIMESTAMP NULL;
ALTER TABLE utilisateur ADD COLUMN last_failed_login TIMESTAMP NULL;

-- Index pour performance
CREATE INDEX idx_locked_until ON utilisateur(locked_until) WHERE locked_until IS NOT NULL;
```

---

## 3️⃣ ESSENTIEL: Structured Logging (2 jours)

### A. Configuration Logging

**Fichier:** `backend/api_gateway/core/logging.py` (NEW)

```python
import json
import logging
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from functools import wraps
from fastapi import Request

class SecurityLogger:
    """Centralized security logging"""
    
    def __init__(self):
        self.logger = logging.getLogger("k_planer_security")
        self.logger.setLevel(logging.INFO)
        
        # JSON handler pour parsing centralisé
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(SecurityJsonFormatter())
        self.logger.addHandler(handler)
    
    def log_event(self, event_type: str, data: Dict[str, Any]):
        """Log security event as JSON"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "service": "k-planer-api-gateway",
            **data
        }
        self.logger.info(json.dumps(log_entry))
    
    def log_auth(self, action: str, user_id: str, ip: str, status: str, details: Dict = None):
        """Log authentication events"""
        self.log_event("AUTH", {
            "action": action,
            "user_id": user_id,
            "ip_address": ip,
            "status": status,
            **(details or {})
        })
    
    def log_access(self, user_id: str, resource_type: str, resource_id: str, action: str, allowed: bool):
        """Log access control events"""
        self.log_event("ACCESS", {
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,  # GET, POST, PUT, DELETE
            "allowed": allowed
        })
    
    def log_error(self, error_type: str, message: str, user_id: str = None, details: Dict = None):
        """Log security errors"""
        self.log_event("ERROR", {
            "error_type": error_type,
            "message": message,
            "user_id": user_id,
            **(details or {})
        })

class SecurityJsonFormatter(logging.Formatter):
    def format(self, record):
        return record.getMessage()

# Global instance
security_logger = SecurityLogger()
```

### B. Utilisation dans Routes

```python
from core.logging import security_logger
from fastapi import Request

@router.post("/login")
async def login(credentials: LoginSchema, request: Request, db: Session):
    # ...
    security_logger.log_auth(
        action="login_attempt",
        user_id=user.id,
        ip=request.client.host,
        status="success"
    )
    # ...

@router.get("/workspace/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    current_user: UtilisateurOut = Depends(get_current_active_user),
    request: Request,
    db: Session = Depends(get_db)
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    
    # Check authorization
    is_member = db.query(Membre).filter(
        Membre.id_workspace == workspace_id,
        Membre.id_utilisateur == current_user.id
    ).first()
    
    if not is_member and workspace.owner_id != current_user.id:
        security_logger.log_access(
            user_id=current_user.id,
            resource_type="workspace",
            resource_id=workspace_id,
            action="GET",
            allowed=False
        )
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    security_logger.log_access(
        user_id=current_user.id,
        resource_type="workspace",
        resource_id=workspace_id,
        action="GET",
        allowed=True
    )
    
    return workspace
```

### C. Log Output (JSON format)

```json
{"timestamp": "2024-01-15T10:30:00Z", "event_type": "AUTH", "service": "k-planer-api-gateway", "action": "login_attempt", "user_id": "u_abc123", "ip_address": "192.168.1.100", "status": "success"}
{"timestamp": "2024-01-15T10:30:05Z", "event_type": "ACCESS", "service": "k-planer-api-gateway", "user_id": "u_abc123", "resource_type": "workspace", "resource_id": "w_xyz789", "action": "GET", "allowed": true}
{"timestamp": "2024-01-15T10:31:00Z", "event_type": "AUTH", "service": "k-planer-api-gateway", "action": "login_attempt", "user_id": "u_def456", "ip_address": "192.168.1.101", "status": "failure", "reason": "invalid_password"}
```

---

## 4️⃣ ENVIRONNEMENT: CORS Configuration (30 min)

**Fichier:** `backend/api_gateway/main.py`

```python
from fastapi.middleware.cors import CORSMiddleware
import os

# ✅ Read from environment
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173"  # Fallback for dev
).split(",")

# Remove whitespace
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS]

print(f"🔒 CORS Allowed Origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # ✅ Explicit list, not wildcard
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Explicit
    allow_headers=["Content-Type", "Authorization"],  # Explicit
    expose_headers=["X-Total-Count", "X-Page-Count"],
    max_age=3600,
)
```

**Fichier:** `.env` (déjà existant, à modifier)

```bash
# Development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Production (décommenter pour prod)
# ALLOWED_ORIGINS=https://k-planer.com,https://app.k-planer.com
```

**Fichier:** `docker-compose.yml` (ajouter env var)

```yaml
services:
  api_gateway:
    environment:
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:5173}
```

---

## 5️⃣ FRONTEND: DOMPurify XSS Protection (1 jour)

### A. Installation

```bash
cd frontend
npm install dompurify
npm install -D @types/dompurify
```

### B. Utility File

**Fichier:** `frontend/src/utils/sanitize.ts` (NEW)

```typescript
import DOMPurify from 'dompurify';

export const SAFE_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: false,
};

export const sanitizeHtml = (html: string, config = SAFE_CONFIG): string => {
  return DOMPurify.sanitize(html, config);
};

export const sanitizeText = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
};
```

### C. Usage Examples

```tsx
// Dans ProfileCard.tsx
import { sanitizeHtml, sanitizeText } from '../utils/sanitize';

export function ProfileCard({ user }) {
  return (
    <div>
      <h2>{sanitizeText(user.username)}</h2>
      <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(user.biographie) }} />
      <a href={sanitizeUrl(user.website)}>Site web</a>
    </div>
  );
}

// Dans TaskDescription.tsx
import { sanitizeHtml } from '../utils/sanitize';

export function TaskDescription({ task }) {
  return (
    <div
      className="task-description"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.description) }}
    />
  );
}
```

---

## 6️⃣ OPTIONAL: npm audit Automation (1 jour)

### Fichier: `.github/workflows/security-audit.yml` (NEW)

```yaml
name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  frontend-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: npm audit
        working-directory: frontend
        run: npm audit --audit-level=moderate
        continue-on-error: true
      
      - name: Generate report
        working-directory: frontend
        run: npm audit --json > audit-report.json
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: npm-audit-report
          path: frontend/audit-report.json

  backend-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install safety
        run: pip install safety
      
      - name: Run safety check
        working-directory: backend/api_gateway
        run: safety check --json > safety-report.json
        continue-on-error: true
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: pip-safety-report
          path: backend/api_gateway/safety-report.json
```

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### Phase 1 - Week 1-2 (CRITIQUE)
- [ ] Security Headers Middleware
- [ ] CORS Environment Configuration  
- [ ] Rate Limiting on /login
- [ ] Account Lockout (attempt counter)
- [ ] Structured Logging System
- [ ] DOMPurify Integration (Frontend)
- [ ] Update Model with security fields
- [ ] Database migrations run

### Phase 2 - Week 3-4 (HAUTE)
- [ ] Backend ownership validation (all routes)
- [ ] Redis for token blacklist
- [ ] Audit logging database
- [ ] Test all endpoints with different roles
- [ ] Frontend CSP headers
- [ ] npm audit automation

### Phase 3 - Week 5-6 (MOYENNE)
- [ ] 2FA Backup codes
- [ ] Password complexity policy
- [ ] Penetration testing
- [ ] Documentation update
- [ ] Team security training

---

## 🧪 TESTS DE VALIDATION

### Teste Security Headers

```bash
curl -i http://localhost:8000/docs | grep -E "Content-Security-Policy|Strict-Transport|X-Frame"
```

**Attendu:**
```
Content-Security-Policy: default-src 'self'...
Strict-Transport-Security: max-age=31536000...
X-Frame-Options: DENY
```

### Test Rate Limiting

```bash
# First 5 requests succeeds
for i in {1..5}; do curl -X POST http://localhost:8000/login -d '{}'; done

# 6th request blocked
curl -X POST http://localhost:8000/login -d '{}'
# Response: HTTP 429 Too Many Requests
```

### Test Structured Logging

```bash
# Vérifier les logs JSON
docker logs api_gateway | grep "event_type" | head -5
```

### Test DOMPurify

```tsx
// Test component
import { sanitizeHtml } from '../utils/sanitize';

const xssPayload = '<img src=x onerror="alert(\'XSS\')" />';
const safe = sanitizeHtml(xssPayload);
console.log(safe);  // Output: <img src="x" /> (sans onerror)
```

---

## 📌 NOTES IMPORTANTES

1. **Backward Compatibility**: Security headers ne cassent rien
2. **Rate Limiting**: À tester avec vrai Redis avant prod
3. **Logging**: Impact perf négligeable (<1% CPU overhead)
4. **DOMPurify**: À exécuter côté client (pas overhead réseau)
5. **Tests**: Ajouter unit tests pour security validators

---

## 🚀 PROCHAINES ÉTAPES APRÈS PHASE 1

1. **Monitoring & Alerting** → Datadog/New Relic pour anomalies
2. **Incident Response** → Playbook documentation
3. **Penetration Testing** → Budget pour expert externe
4. **Compliance** → ISO 27001 / SOC 2 track
5. **User Communication** → Password policy changes newsletter

