# ✅ DÉPLOIEMENT IMMÉDIAT - CHECKLIST CRITIQUE
## K-Planer Security - Week 1 Action Items

**Created:** 7 juillet 2026  
**Priority:** 🔴 URGENT - À faire cette semaine  
**Responsable:** Lead Dev + CTO  
**Deadline:** Vendredi soir

---

## 📋 CHECKLIST JOUR PAR JOUR

### ⏰ JOUR 1 - LUNDI (4 heures)

**Matin: Validation Input (2h)**
- [ ] Créer `backend/api_gateway/schemas/Auth.py` avec validators Pydantic
- [ ] Ajouter `@validator` pour: email (EmailStr), username (regex), password (8+ chars + uppercase + digit)
- [ ] Tester validators: `pytest backend/tests/test_validators.py`

```python
# Quick Code to Copy:
from pydantic import BaseModel, EmailStr, validator, Field

class LoginSchema(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def password_strong(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase')
        return v
```

**Après-midi: Rate Limiting Setup (2h)**
- [ ] `pip install slowapi redis`
- [ ] `docker-compose up redis` (vérifier running)
- [ ] Ajouter limiter à `main.py`

```python
# Quick Code:
from slowapi import Limiter
limiter = Limiter(key_func=..., storage_uri="redis://localhost:6379")
app.state.limiter = limiter
```

**EOM:** ✅ Validators testés + Redis running

---

### ⏰ JOUR 2 - MARDI (4 heures)

**Toute la journée: Rate Limit Endpoints (4h)**
- [ ] Apply `@limiter.limit()` aux endpoints:
  - `/auth/login` → `"5/minute"`
  - `/auth/register` → `"3/minute"`
  - `/auth/reset-password` → `"10/hour"`
  - `/auth/verify-email` → `"10/hour"`
  - `/invite/send` → `"20/hour"`

```python
# Quick Code:
@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(...): pass
```

- [ ] Test: `curl -X POST http://localhost:8002/auth/login ... ` × 6 times
- [ ] Expect: 6ème retourne HTTP 429

**EOM:** ✅ Rate limiting sur tous endpoints + tests OK

---

### ⏰ JOUR 3 - MERCREDI (4 heures)

**Matin: CSP Frontend (2h)**
- [ ] Éditer `frontend/index.html`
- [ ] Copy-paste la CSP level 3 stricte (voir P1_CORRECTIONS_CODE_CRITIQUES.md)
- [ ] Vérifier: `<meta http-equiv="Content-Security-Policy" content="..."`

```html
<!-- Quick Insert: -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'nonce-xyz';
  frame-ancestors 'none';
"/>
```

**Après-midi: Nonce in Vite (2h)**
- [ ] Éditer `frontend/vite.config.ts`
- [ ] Ajouter plugin pour générer nonce dynamique
- [ ] Test build: `npm run build` → vérifier nonce dans HTML

**EOM:** ✅ CSP active + Nonce généré automatiquement

---

### ⏰ JOUR 4 - JEUDI (4 heures)

**Toute la journée: Tests & Review (4h)**
- [ ] Tests E2E: login + rate limit (20 min)
- [ ] Tests E2E: register + validation (20 min)  
- [ ] Tests CSP: ouvrir DevTools → 0 violations (20 min)
- [ ] Code review (1h)
- [ ] Merge branches (20 min)
- [ ] Staging deployment (1h)

```bash
# Quick Commands:
pytest backend/tests/test_validators.py -v
pytest backend/tests/test_rate_limiting.py -v
npm run build
npm run preview
```

**EOM:** ✅ Tous tests passent + Code approuvé

---

### ⏰ JOUR 5 - VENDREDI (2 heures)

**Déploiement Production (2h)**
- [ ] Smoke tests en production (20 min)
- [ ] Vérifier: Input validation OK? (10 min)
- [ ] Vérifier: Rate limit OK? (10 min)
- [ ] Vérifier: CSP OK? DevTools → 0 warnings (10 min)
- [ ] Rollback plan ready? (20 min)

**DONE:** 🎉 P1 Terminé - Prêt pour Week 2

---

## 🎯 OBJECTIFS P1 (SEMAINE 1)

| Objectif | Status | EOM |
|----------|--------|-----|
| Input Validation | ⏳ | Lundi soir |
| Rate Limiting Setup | ⏳ | Mardi soir |
| Rate Limiting Endpoints | ⏳ | Mardi soir |
| CSP Implementation | ⏳ | Mercredi soir |
| Nonce Generation | ⏳ | Mercredi soir |
| Tests & Review | ⏳ | Jeudi soir |
| Production Deploy | ⏳ | Vendredi soir |
| **TOTAL** | **P1 DONE** | **Vendredi** |

---

## 📞 HELP NEEDED?

**Input Validation Questions?**
→ See: [P1_CORRECTIONS_CODE_CRITIQUES.md](P1_CORRECTIONS_CODE_CRITIQUES.md) - Section P1.1

**Rate Limiting Questions?**
→ See: [P1_CORRECTIONS_CODE_CRITIQUES.md](P1_CORRECTIONS_CODE_CRITIQUES.md) - Section P1.3

**CSP Questions?**
→ See: [P1_CORRECTIONS_CODE_CRITIQUES.md](P1_CORRECTIONS_CODE_CRITIQUES.md) - Section P1.2

**Timeline Questions?**
→ See: [PLAN_EXECUTION_COMPLET.md](PLAN_EXECUTION_COMPLET.md)

---

## ⏱️ EFFORT ESTIMATES

| Tâche | Effort | Reality |
|-------|--------|---------|
| Input Validation | 4h | 3-4h |
| Rate Limiting | 4h | 3-5h |
| CSP + Nonce | 4h | 3-4h |
| Tests | 4h | 4-6h |
| **Total P1** | **16h** | **13-19h** |

---

## ✅ DEFINITION OF DONE (P1)

```
☐ Input validation working on all auth endpoints
☐ Rate limiting rejecting requests after limit
☐ CSP header present & enforced (0 violations)
☐ Nonce generated automatically per build
☐ All unit tests passing (>85% coverage)
☐ All integration tests passing
☐ Code reviewed & approved
☐ Deployed to staging & validated
☐ Ready for production
☐ Post-mortem docs updated
```

---

## 🚨 IF SOMETHING BREAKS

1. **Check error logs:** `docker logs k-planer-api-gateway`
2. **Rollback:** `git revert <commit>`
3. **Rebuild:** `docker-compose up --build`
4. **Verify:** `curl http://localhost:8002/health`

---

**Team:** Next meeting Monday 9 AM  
**Owner Sign-Off:** ________________  
**Date:** ________________

---

## 🎯 SEMAINES 2+ (Prochaines étapes)

Une fois P1 complété:

**Week 2-3 (P2):**
- Configuration externalisée
- CORS whitelist
- Log sanitization
- Token rotation

**Week 4-6 (P3):**
- 2FA/TOTP
- Monitoring (Sentry)
- WAF headers
- Pen testing

👉 Voir: [P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md](P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md)
