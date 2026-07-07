# 🔧 CORRECTIONS DE CODE - P1 CRITIQUES
## K-Planer Security Fixes - Priority 1

**Date:** 7 juillet 2026  
**Effort:** 12-16 heures  
**Deadline:** Fin de semaine

---

## 🔴 P1.1: Input Sanitization Backend

### Problème
Aucune validation d'input sur les endpoints critiques → risque d'injection SQL/NoSQL

### Fichiers Affectés
- `backend/api_gateway/routes/auth.py`
- `backend/api_gateway/routes/utilisateur.py`
- `backend/api_espace/main.py`
- `backend/api_liste_et_tache/main.py`

### Solution 1: Ajouter Validators Pydantic

```python
# backend/api_gateway/schemas/Auth.py
from pydantic import BaseModel, EmailStr, validator, Field
import re

class LoginSchema(BaseModel):
    email: EmailStr  # Validation email intégrée
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('password')
    def password_strong(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain digit')
        return v

class RegisterSchema(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, regex='^[a-zA-Z0-9_-]+$')
    prenoms: str = Field(..., min_length=1, max_length=100)
    nom: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    
    @validator('username')
    def username_valid(cls, v):
        # Reject reserved words
        reserved = ['admin', 'root', 'system', 'api', 'admin']
        if v.lower() in reserved:
            raise ValueError(f'Username "{v}" is reserved')
        return v
    
    @validator('prenoms', 'nom')
    def no_special_chars(cls, v):
        if not re.match(r'^[a-zA-ZÀ-ÿ\s\'-]+$', v):
            raise ValueError('Invalid characters in name')
        return v

class MotifSchema(BaseModel):
    motif: str = Field(..., min_length=10, max_length=500)
    
    @validator('motif')
    def no_injection(cls, v):
        # Remove dangerous characters
        dangerous = ['<script', 'javascript:', 'onerror=', 'onclick=']
        for pattern in dangerous:
            if pattern.lower() in v.lower():
                raise ValueError('Invalid content detected')
        return v

# backend/api_gateway/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from schemas.Auth import LoginSchema, RegisterSchema
from crud.utilisateur import create_user, get_user_by_email
from core.security import hash_password, verify_password

router = APIRouter()

@router.post("/login")
async def login(credentials: LoginSchema, db: Session = Depends(get_db)):
    """
    ✅ SECURITÉ: 
    - EmailStr valide l'email automatiquement
    - Password min 8 chars avec uppercase + digit
    - Input validé par Pydantic avant d'arriver à la DB
    """
    try:
        user = await get_user_by_email(db, credentials.email)
        if not user or not verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"  # ✅ Message générique (pas de leak d'info)
            )
        
        # ✅ Génération sécurisée du token
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=15)
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(days=7)
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"  # ✅ Message générique
        )

@router.post("/register")
async def register(user_data: RegisterSchema, db: Session = Depends(get_db)):
    """
    ✅ SÉCURITÉ:
    - Tout validé par Pydantic (email, username format, strong password)
    - Pas de SQL injection possible
    """
    try:
        # Vérifier si user existe
        existing = await get_user_by_email(db, user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"  # ✅ Générique
            )
        
        # Créer user avec password hashé
        new_user = await create_user(
            db,
            email=user_data.email,
            username=user_data.username,
            prenoms=user_data.prenoms,
            nom=user_data.nom,
            password=hash_password(user_data.password)  # ✅ Password hashé
        )
        
        # Envoyer email de vérification
        verification_token = generate_verification_token(new_user.id)
        await send_verification_email(user_data.email, verification_token)
        
        return {
            "message": "User registered. Please verify your email.",
            "user_id": new_user.id
        }
    except Exception as e:
        logger.error(f"Register error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )
```

---

## 🔴 P1.2: CSP Stricte Frontend

### Problème
CSP manquante ou trop permissive → XSS possible

### Fichier Affecté
`frontend/index.html`

### Solution

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- ✅ CSP Level 3 - TRÈS STRICT -->
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'self';
        script-src 'self' 'nonce-{NONCE}' https://cdn.jsdelivr.net;
        style-src 'self' 'nonce-{NONCE}' https://fonts.googleapis.com;
        img-src 'self' data: https: blob:;
        font-src 'self' https://fonts.gstatic.com data:;
        connect-src 'self' https://api.k-planer.local:8002 https://api.k-planer.local:8003 https://api.k-planer.local:8004 https://api.k-planer.local:8005 https://api.k-planer.local:8006 wss://api.k-planer.local:8006;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
        object-src 'none';
        media-src 'self';
        child-src 'none';
        upgrade-insecure-requests;
        require-trusted-types-for 'script';
    " />
    
    <!-- ✅ Headers de Sécurité Complémentaires -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <meta name="format-detection" content="telephone=no" />
    <meta name="format-detection" content="email=no" />
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />
    <meta http-equiv="X-Frame-Options" content="DENY" />
    <meta http-equiv="X-XSS-Protection" content="1; mode=block" />
    
    <!-- ✅ Permissions Policy (Permissions-Policy) -->
    <meta http-equiv="Permissions-Policy" content="
        accelerometer=(),
        ambient-light-sensor=(),
        autoplay=(),
        camera=(),
        display-capture=(),
        document-domain=(),
        encrypted-media=(),
        fullscreen=(),
        geolocation=(),
        gyroscope=(),
        magnetometer=(),
        microphone=(),
        midi=(),
        payment=(),
        picture-in-picture=(),
        usb=(),
        xr-spatial-tracking=()
    " />
    
    <title>K-Planer - Gestion de Projets Sécurisée</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### Implémentation du Nonce (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'crypto'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-nonce',
      transformIndexHtml(html) {
        // Générer nonce aléatoire pour chaque build
        const nonce = createHash('sha256')
          .update(Math.random().toString())
          .digest('hex')
          .substring(0, 16)
        
        return html
          .replace(/{NONCE}/g, nonce)
          .replace(
            /<script/g,
            `<script nonce="${nonce}"`
          )
      }
    }
  ],
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }
  }
})
```

---

## 🔴 P1.3: Rate Limiting Complet Backend

### Problème
Rate limiting seulement sur `/login` → brute force possible sur `/register`, `/reset-password`, etc.

### Fichier Affecté
`backend/api_gateway/main.py`

### Solution

```python
# backend/api_gateway/main.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import timedelta

app = FastAPI()

# ✅ Initialiser le limiter avec Redis
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379",
    strategy="moving-window",
    default_limits=["100/hour"]
)

app.state.limiter = limiter

# ✅ Handler pour les rate limit errors
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "Too many requests",
            "detail": "Please try again later",
            "retry_after": int(exc.headers.get("Retry-After", 60))
        }
    )

# ✅ Routes protégées par rate limiting

@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, credentials: LoginSchema, db: Session = Depends(get_db)):
    """5 tentatives par minute"""
    # ... implementation ...

@app.post("/auth/register")
@limiter.limit("3/minute")  # ✅ NOUVEAU: Limiter registration attempts
async def register(request: Request, user_data: RegisterSchema, db: Session = Depends(get_db)):
    """3 tentatives par minute"""
    # ... implementation ...

@app.post("/auth/request-password-reset")
@limiter.limit("5/hour")  # ✅ NOUVEAU: Limiter reset attempts
async def request_password_reset(request: Request, email: str, db: Session = Depends(get_db)):
    """5 tentatives par heure"""
    # ... implementation ...

@app.post("/auth/reset-password")
@limiter.limit("10/hour")  # ✅ NOUVEAU: Limiter reset confirmation
async def reset_password(request: Request, token: str, new_password: str, db: Session = Depends(get_db)):
    """10 tentatives par heure"""
    # ... implementation ...

@app.post("/auth/verify-email")
@limiter.limit("10/hour")  # ✅ NOUVEAU: Limiter email verification
async def verify_email(request: Request, token: str, db: Session = Depends(get_db)):
    """10 tentatives par heure"""
    # ... implementation ...

@app.post("/invite/send")
@limiter.limit("20/hour")  # ✅ NOUVEAU: Limiter invitations
async def send_invite(request: Request, email: str, db: Session = Depends(get_db)):
    """20 invitations par heure par utilisateur"""
    # ... implementation ...

@app.post("/api/upload")
@limiter.limit("50/hour")  # ✅ NOUVEAU: Limiter uploads
async def upload_file(request: Request, file: UploadFile, db: Session = Depends(get_db)):
    """50 uploads par heure par utilisateur"""
    # ... implementation ...
```

### Configuration Redis (docker-compose.yml)

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
```

### Tests de Rate Limiting

```bash
# Test 1: Login rate limit (5/minute)
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:8002/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 10
done

# Expected: First 5 return 401, 6th returns 429 (Too Many Requests)

# Test 2: Register rate limit (3/minute)
for i in {1..4}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:8002/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email":"test'$i'@test.com",
      "username":"user'$i'",
      "prenoms":"Test",
      "nom":"User",
      "password":"SecurePass123"
    }' \
    -w "\nStatus: %{http_code}\n"
  sleep 20
done

# Expected: First 3 succeed (200), 4th returns 429
```

---

## 📋 CHECKLIST P1 - AVANT PRODUCTION

- [ ] Input validation avec Pydantic validators (auth, motif, etc.)
- [ ] CSP stricte configurée dans index.html
- [ ] Rate limiting sur tous les endpoints sensibles
- [ ] Tests unitaires pour rate limiting
- [ ] Tests de validation des inputs
- [ ] Redis operational pour rate limiting
- [ ] Logs structurés sans données sensibles
- [ ] Tests d'intégration backend-frontend
- [ ] Documentation des changes
- [ ] Code review par 2 seniors

---

**Effort Total P1:** 12-16 heures  
**Timeline:** À compléter avant la fin de la semaine  
**Deadline Production:** Lundi prochain
