# 📋 PLAN D'EXÉCUTION - AUDIT SÉCURITÉ K-PLANER
## Roadmap Complète OWASP Top 10:2025

**Date de Création:** 7 juillet 2026  
**Status:** ✅ PRÊT POUR EXÉCUTION  
**Effort Total:** 30-42 heures sur 6 semaines  
**Deadline Production:** Fin août 2026

---

## 📊 SITUATION ACTUELLE

| Catégorie OWASP | État Actuel | État Cible | Conformance |
|---|---|---|---|
| A01: Broken Access Control | 🟡 Partial | ✅ Full | 65% → 95% |
| A02: Cryptographic Failures | 🟡 Partial | ✅ Full | 70% → 100% |
| A03: Injection | 🔴 Missing | ✅ Full | 30% → 95% |
| A04: Insecure Design | 🟡 Partial | ✅ Full | 60% → 90% |
| A05: Security Misconfiguration | 🟡 Partial | ✅ Full | 55% → 90% |
| A06: Vulnerable Components | 🟢 Good | ✅ Good | 80% → 90% |
| A07: Authentication Failures | 🟡 Partial | ✅ Full | 65% → 95% |
| A08: Data Integrity Failures | 🟡 Partial | ✅ Full | 60% → 90% |
| A09: Logging & Monitoring | 🔴 Missing | ✅ Full | 40% → 90% |
| A10: SSRF | 🟡 Partial | ✅ Full | 55% → 85% |
| **TOTAL** | **62%** | **87%** | **+25%** |

---

## 🚀 SEMAINE 1: CRITIQUES (P1)

### Jour 1 - Lundi (4h)

**Matin (2h):**
1. **Input Validation Backend**
   - [ ] Créer `backend/api_gateway/schemas/Auth.py` avec validators Pydantic
   - [ ] Ajouter `@validator` pour email, username, password, motif
   - [ ] Tests unitaires pour chaque validator
   - **Files:** P1_CORRECTIONS_CODE_CRITIQUES.md → Section P1.1
   - **Command:** `pytest backend/tests/test_validators.py`

**Après-midi (2h):**
2. **Rate Limiting Setup**
   - [ ] Installer `pip install slowapi redis`
   - [ ] Configurer Redis (docker-compose.yml)
   - [ ] Ajouter limiter au main.py
   - **Files:** P1_CORRECTIONS_CODE_CRITIQUES.md → Section P1.3
   - **Command:** `docker-compose up redis`

**EOM Check:**
- [ ] Validators testés ✅
- [ ] Redis running ✅
- [ ] Limiter implémenté ✅

---

### Jour 2 - Mardi (4h)

**Matin (2h):**
3. **Rate Limiting Endpoints**
   - [ ] Appliquer `@limiter.limit()` aux endpoints sensibles
   - [ ] `/auth/login` → 5/minute
   - [ ] `/auth/register` → 3/minute
   - [ ] `/auth/reset-password` → 10/hour
   - [ ] `/auth/verify-email` → 10/hour
   - [ ] `/invite/send` → 20/hour
   - **Files:** P1_CORRECTIONS_CODE_CRITIQUES.md → Section P1.3
   - **Test:** `curl -X POST http://localhost:8002/auth/login ... ` × 6 times

**Après-midi (2h):**
4. **Tests Rate Limiting**
   - [ ] Script bash pour tester les limites
   - [ ] Vérifier que le 6ème appel retourne 429
   - [ ] Tests unitaires avec pytest
   - **Files:** P1_CORRECTIONS_CODE_CRITIQUES.md → Tests section
   - **Command:** `bash test_rate_limits.sh`

**EOM Check:**
- [ ] Rate limiting sur tous endpoints ✅
- [ ] Tests validant les limites ✅
- [ ] Redis persistence ✅

---

### Jour 3 - Mercredi (4h)

**Matin (2h):**
5. **CSP Configuration Frontend**
   - [ ] Éditer `frontend/index.html`
   - [ ] Ajouter CSP level 3 strict
   - [ ] Ajouter tous les security headers
   - [ ] Permissions-Policy configurée
   - **Files:** P1_CORRECTIONS_CODE_CRITIQUES.md → Section P1.2
   - **Verify:** Ouvrir dev console, vérifier CSP actif

**Après-midi (2h):**
6. **Nonce Implementation**
   - [ ] Ajouter plugin nonce dans `vite.config.ts`
   - [ ] Générer nonce dynamique par build
   - [ ] Tester en development et production
   - **Files:** P1_CORRECTIONS_CODE_CRITIQUES.md → Section P1.2
   - **Command:** `npm run build` → Vérifier nonce dans HTML

**EOM Check:**
- [ ] CSP stricte en place ✅
- [ ] Nonce généré automatiquement ✅
- [ ] Browser console: 0 CSP violations ✅

---

### Jour 4 - Jeudi (4h)

**Matin (2h):**
7. **Integration Tests**
   - [ ] Tests E2E: login + rate limit
   - [ ] Tests E2E: register + validation
   - [ ] Tests CSP: vérifier qu'inline scripts bloqués
   - **Files:** `backend/tests/test_integration.py`

**Après-midi (2h):**
8. **Documentation & Review**
   - [ ] Code review P1 changes
   - [ ] Update CHANGELOG
   - [ ] Prépar release notes
   - [ ] Security checklist sign-off

**EOM Check:**
- [ ] Tous tests passing ✅
- [ ] Code review approuvé ✅
- [ ] P1 ready for production ✅

---

### Jour 5 - Vendredi (2h)

9. **Deployment Readiness**
   - [ ] Staging deployment
   - [ ] Smoke tests
   - [ ] Performance baseline
   - [ ] Rollback plan prêt

**Status:** 🟢 P1 COMPLET

---

## 🟠 SEMAINE 2-3: HAUTE PRIORITÉ (P2)

### Semaine 2 - Configuration & Secrets

**Jour 1 - Lundi (3h):**
10. **Configuration System**
    - [ ] Créer `backend/config.py`
    - [ ] Implémenter BaseSettings + validation
    - [ ] Créer `.env.example`
    - **Files:** P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md → Section P2.1
    - **Test:** `python -c "from config import get_settings; print(get_settings())"`

**Jour 2 - Mardi (3h):**
11. **Secrets Management**
    - [ ] Configurer `.env` en production (ou AWS Secrets Manager)
    - [ ] Valider tous les secrets au startup
    - [ ] Tests pour secrets non configurés
    - **Files:** P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md → Section P2.1
    - **Test:** `pytest backend/tests/test_config.py`

**Jour 3 - Mercredi (3h):**
12. **CORS Whitelist**
    - [ ] Configurer CORS par environment
    - [ ] Rejeter wildcard + localhost en production
    - [ ] Tests CORS
    - **Files:** P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md → Section P2.2
    - **Test:** `curl -H "Origin: https://attacker.com" ...`

**Jour 4 - Jeudi (3h):**
13. **Logging Sanitization**
    - [ ] Créer `backend/core/logging.py` avec SensitiveDataFilter
    - [ ] Implémenter `sanitize_dict()`, `sanitize_string()`
    - [ ] Tests pour password/token masquage
    - **Files:** P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md → Section P2.3
    - **Test:** `pytest backend/tests/test_logging.py`

**Jour 5 - Vendredi (2h):**
14. **Week 2 Testing**
    - [ ] Integration tests tous les P2 items
    - [ ] Code review
    - [ ] Documentation

**Status:** 🟠 P2 Semaine 1/2 en cours

---

### Semaine 3 - Token & Frontend

**Jour 1 - Lundi (3h):**
15. **SRI Hashes**
    - [ ] Calculer SHA384 pour chaque external script
    - [ ] Ajouter integrity attributes
    - [ ] Tester qu'external scripts bloqués si hash mauvais
    - **Files:** P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md → Section P2.4
    - **Command:** `npx sri-generator https://...`

**Jour 2 - Mardi (3h):**
16. **Token Manager**
    - [ ] Créer TokenManager avec create_access_token(), create_refresh_token()
    - [ ] Access token: 15 min
    - [ ] Refresh token: 7 jours
    - **Files:** P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md → Section P2.5
    - **Test:** `pytest backend/tests/test_tokens.py`

**Jour 3 - Mercredi (3h):**
17. **Token Refresh Endpoint**
    - [ ] Implémenter `/auth/refresh` endpoint
    - [ ] Vérifier refresh token → nouveau access token
    - [ ] httpOnly cookie secure
    - **Files:** P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md → Section P2.5
    - **Test:** Token refresh workflow

**Jour 4 - Jeudi (3h):**
18. **URL Validation Frontend**
    - [ ] Créer `frontend/src/utils/url-validator.ts`
    - [ ] Implémenter isValidRedirectUrl(), sanitizeRedirectUrl()
    - [ ] Tester redirect attacks prévention
    - **Files:** P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md → Section P2.6
    - **Test:** `npm test -- url-validator`

**Jour 5 - Vendredi (2h):**
19. **Week 3 Integration & Deploy**
    - [ ] Tous tests passing
    - [ ] Code review approuvé
    - [ ] Staging deployment
    - [ ] Performance check

**Status:** 🟢 P2 COMPLET

---

## 🟡 SEMAINE 4-6: PRIORITÉ MOYENNE (P3)

### Semaine 4 - 2FA Setup

**Jour 1-2 (Lun-Mar, 6h):**
20. **TOTP Implementation**
    - [ ] Installer `pip install pyotp qrcode pillow`
    - [ ] Implémenter TwoFactorManager
    - [ ] generate_secret_and_qr(), verify_totp()
    - [ ] Tests TOTP verification
    - **Files:** P3_CORRECTIONS_CODE_PRIORITE_MOYENNE.md → Section P3.1

**Jour 3-4 (Mer-Jeu, 6h):**
21. **2FA Endpoints Backend**
    - [ ] POST `/auth/2fa/setup`
    - [ ] POST `/auth/2fa/setup/confirm`
    - [ ] POST `/auth/login/2fa` (with code)
    - [ ] Backup codes generation & verification
    - **Files:** P3_CORRECTIONS_CODE_PRIORITE_MOYENNE.md → Section P3.1

**Jour 5 (Ven, 3h):**
22. **2FA Frontend Component**
    - [ ] Settings2FAPage component
    - [ ] QR code display
    - [ ] Code input (6 digits only)
    - [ ] Backup codes storage UI
    - **Files:** P3_CORRECTIONS_CODE_PRIORITE_MOYENNE.md → Section P3.1

**Status:** 🟡 2FA working end-to-end

---

### Semaine 5 - Monitoring & WAF

**Jour 1-2 (Lun-Mar, 6h):**
23. **Sentry Setup**
    - [ ] Installer `pip install sentry-sdk`
    - [ ] Configurer Sentry DSN
    - [ ] Ajouter FastAPI integration
    - [ ] Tests error capture
    - **Files:** P3_CORRECTIONS_CODE_PRIORITE_MOYENNE.md → Section P3.2

**Jour 3-4 (Mer-Jeu, 6h):**
24. **CloudWatch Alarms**
    - [ ] Créer SNS topic pour alerts
    - [ ] Setup CloudWatch alarms:
      - Failed login spike (>20 in 5min)
      - High error rate (>10 500s in 1min)
      - Unauthorized access (>5 in 1min)
    - [ ] Test alert triggers
    - **Files:** P3_CORRECTIONS_CODE_PRIORITE_MOYENNE.md → Section P3.2

**Jour 5 (Ven, 3h):**
25. **WAF Headers**
    - [ ] Ajouter WAFHeadersMiddleware
    - [ ] Vérifier headers présents dans responses
    - [ ] Tests CSP, HSTS, X-Frame-Options
    - **Files:** P3_CORRECTIONS_CODE_PRIORITE_MOYENNE.md → Section P3.3

**Status:** 🟡 Monitoring & Alerting live

---

### Semaine 6 - Testing & Penetration

**Jour 1-3 (Lun-Mer, 9h):**
26. **Penetration Testing**
    - [ ] Engager pen tester externe (OU faire interne)
    - [ ] Scope défini
    - [ ] Règles d'engagement signées
    - [ ] Tests de vulnérabilités
    - [ ] Rapport préliminaire
    - **Files:** P3_CORRECTIONS_CODE_PRIORITE_MOYENNE.md → Section P3.4

**Jour 4 (Jeu, 3h):**
27. **Final Testing Suite**
    - [ ] Tous les tests P1, P2, P3
    - [ ] Integration tests complets
    - [ ] Performance benchmark
    - [ ] Security audit checklist
    - **Command:** `pytest backend/ -v`

**Jour 5 (Ven, 2h):**
28. **Production Release**
    - [ ] Final code review
    - [ ] Documentation finalisée
    - [ ] Release notes
    - [ ] Monitoring dashboard active

**Status:** 🟢 P3 COMPLET → Production Ready

---

## 📋 DAILY STANDUP TEMPLATE

```markdown
## Daily Standup - [Date]

### Completed Today
- [ ] Task 1: [description]
- [ ] Task 2: [description]

### In Progress
- [ ] Task 3: [description]

### Blockers
- [ ] Blocker 1: [description]

### Tomorrow's Plan
- [ ] Task 4: [description]

### Metrics
- Tests Passing: X/Y
- Coverage: X%
- Security Score: X/100
```

---

## 🎯 SUCCESS CRITERIA

### End of Each Week

**Week 1 (P1):**
- ✅ Input validation: 100% endpoints covered
- ✅ Rate limiting: All critical endpoints protected
- ✅ CSP: Level 3 strict active, 0 violations in browser console
- ✅ All tests passing
- ✅ Performance: No regression

**Week 3 (P2):**
- ✅ Configuration: All secrets externalized
- ✅ CORS: Whitelist only
- ✅ Logging: 0 sensitive data in logs
- ✅ SRI: All external scripts protected
- ✅ Tokens: Access token rotation working
- ✅ All tests passing

**Week 6 (P3):**
- ✅ 2FA: Working end-to-end
- ✅ Monitoring: Sentry capturing all errors
- ✅ Alerting: CloudWatch alarms triggered correctly
- ✅ WAF: All security headers present
- ✅ Pen testing: Report reviewed, critical items fixed
- ✅ OWASP conformance: 87% target reached

---

## 💾 DEPLOYMENT CHECKLIST

```markdown
## Pre-Production Deployment

### Backend
- [ ] .env configured with production secrets
- [ ] Database migrations applied
- [ ] Redis configured and tested
- [ ] All secrets externalized (no hardcoding)
- [ ] Logging sanitization active
- [ ] Rate limiting thresholds adjusted
- [ ] CSP headers configured
- [ ] CORS whitelist production domains only
- [ ] Health check endpoint responding
- [ ] Metrics/monitoring active

### Frontend
- [ ] Environment variables set
- [ ] API endpoints point to production
- [ ] CSP nonce generation working
- [ ] SRI hashes present on all external scripts
- [ ] No console errors/warnings
- [ ] Build optimized (minified, tree-shaken)
- [ ] No hardcoded development URLs

### Infrastructure
- [ ] SSL/TLS certificates valid (18+ months)
- [ ] Firewall rules configured
- [ ] WAF rules active
- [ ] CDN configured
- [ ] Backup strategy active
- [ ] Monitoring dashboards live
- [ ] Alert recipients configured
- [ ] Incident response team ready

### Security
- [ ] Secrets Manager configured
- [ ] SSH keys rotated
- [ ] Database credentials rotated
- [ ] API keys rotated
- [ ] Security team sign-off
- [ ] Incident response plan reviewed

### Testing
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Performance tests baseline OK
- [ ] Security tests passing
- [ ] Load test passed (X requests/sec)
- [ ] Failover tested

### Documentation
- [ ] README updated
- [ ] API documentation current
- [ ] Deployment guide created
- [ ] Troubleshooting guide created
- [ ] Team trained on new security features
```

---

## 🚨 EMERGENCY PROCEDURES

### If Critical Vulnerability Found

1. **STOP deployment** (if not yet live)
2. **Isolate impact**: Which components affected?
3. **Immediate fix**: Apply temporary mitigation
4. **Fix implementation**: Permanent solution
5. **Test thoroughly**: New tests for regression
6. **Deploy fix**: Priority deployment
7. **Post-mortem**: Analyze root cause

### Rollback Plan

```bash
# If production breaks:
git revert <commit>
docker-compose up --build
# Verify all services healthy
curl http://localhost:8002/health
```

---

## 📞 CONTACTS & ESCALATION

**Security Lead:** [Name] - security@k-planer.local  
**DevOps Lead:** [Name] - devops@k-planer.local  
**Backend Lead:** [Name] - backend@k-planer.local  
**Frontend Lead:** [Name] - frontend@k-planer.local  

**Security Hotline:** +33 X XXX XXX XXX  
**Out-of-Hours:** On-call via Pagerduty

---

## 📚 REFERENCE DOCUMENTS

1. **P1_CORRECTIONS_CODE_CRITIQUES.md** - Week 1 critical fixes
2. **P2_CORRECTIONS_CODE_HAUTE_PRIORITE.md** - Weeks 2-3 high priority fixes
3. **P3_CORRECTIONS_CODE_PRIORITE_MOYENNE.md** - Weeks 4-6 medium priority fixes
4. **AUDIT_SECURITE_OWASP_2025_SYNTHESE.md** - Full audit report
5. **OWASP Top 10:2025** - https://owasp.org/Top10/

---

**Next Review:** Every Monday 9 AM  
**Project Owner Sign-Off:** _____________  
**Security Lead Sign-Off:** _____________  
**Date:** _____________
