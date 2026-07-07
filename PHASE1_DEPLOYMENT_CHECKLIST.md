# ⚡ PHASE 1 DEPLOYMENT CHECKLIST - K-Planer Security
## Quick Reference for Implementation Team

**Total Duration:** 10 working days  
**Team:** 2 developers (backend + frontend)  
**Cost:** €3,400

---

## 📋 PRE-IMPLEMENTATION (Day 0)

### Team Setup
- [ ] Assign 1 backend developer (full-time, Days 1-10)
- [ ] Assign 1 frontend developer (full-time, Days 1-3, 7-8)
- [ ] Daily standup scheduled (15 min)
- [ ] Staging environment ready to test
- [ ] Redis test instance available

### Documentation
- [ ] IMPLEMENTATION_SECURITE_PHASE1.md printed/shared
- [ ] Code review process defined
- [ ] Testing strategy confirmed
- [ ] Rollback plan documented

### Repository
- [ ] Feature branch created: `feature/security-hardening-phase-1`
- [ ] CI/CD pipeline checked
- [ ] Database backup taken
- [ ] Staging environment clean

---

## 🔧 DAY 1-2: SECURITY HEADERS (Backend Dev)

### Implementation
- [ ] Create `SecurityHeadersMiddleware` class
- [ ] Add to FastAPI app
- [ ] Configure all 6 headers:
  - [ ] Content-Security-Policy
  - [ ] Strict-Transport-Security
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options
  - [ ] X-XSS-Protection
  - [ ] Referrer-Policy

### Testing
```bash
□ curl -i http://localhost:8000/docs | grep -i "content-security"
  Expected: Content-Security-Policy: default-src 'self'...
  
□ curl -i http://localhost:8000/docs | grep -i "strict-transport"
  Expected: Strict-Transport-Security: max-age=31536000...
  
□ curl -i http://localhost:8000/docs | grep -i "x-frame"
  Expected: X-Frame-Options: DENY
```

### Code Review
- [ ] Middleware code reviewed
- [ ] No performance issues detected
- [ ] Headers match OWASP recommendations
- [ ] Tests passing

### Deployment
- [ ] Merged to develop branch
- [ ] Deployed to staging
- [ ] Browser security audit passed (https://securityheaders.com)

---

## 🔧 DAY 3-4: RATE LIMITING (Backend Dev)

### Setup
```bash
□ pip install fastapi-limiter2 redis aioredis
□ Test Redis connection: redis-cli ping
□ Update requirements.txt
```

### Backend Code
- [ ] Copy rate limiting code to `core/security.py`
- [ ] Create `limiter` instance with Redis
- [ ] Add to FastAPI lifespan (startup/shutdown)
- [ ] Apply `@limiter.limit("5/minute")` to `/login`

### Database Changes
- [ ] Add fields to Utilisateur model:
  - [ ] failed_login_attempts: int
  - [ ] locked_until: Optional[datetime]
  - [ ] last_login: Optional[datetime]
  - [ ] last_failed_login: Optional[datetime]
- [ ] Generate migration: `alembic revision --autogenerate`
- [ ] Review migration file
- [ ] Test migration on staging

### Login Logic Update
- [ ] Check if account is locked
- [ ] Increment failed_login_attempts on failure
- [ ] Lock account after 5 failed attempts
- [ ] Reset counters on successful login
- [ ] Log all auth events

### Testing
```bash
□ Successful login: WORKS ✓
□ Wrong password x1: Still works ✓
□ Wrong password x2: Still works ✓
□ Wrong password x3: Still works ✓
□ Wrong password x4: Still works ✓
□ Wrong password x5: Account locked ✓
□ 6th attempt: HTTP 429 Too Many Requests ✓
□ Wait 30 min: Account unlocked ✓

□ Rate limiting: 5 requests/minute
  - 5 requests: All succeed ✓
  - 6th request: HTTP 429 ✓
```

### Code Review
- [ ] Account lockout logic correct
- [ ] Rate limiting working as expected
- [ ] No bypass vulnerabilities
- [ ] Error messages appropriate

### Deployment
- [ ] Migration applied to staging
- [ ] Integration tests passing
- [ ] Deployed to staging
- [ ] Monitored for Redis errors

---

## 🔧 DAY 5: STRUCTURED LOGGING (Backend Dev)

### Setup
```bash
□ Create new file: backend/api_gateway/core/logging.py
□ Copy SecurityLogger class
□ Update imports in routes/auth.py
```

### Implementation
- [ ] SecurityLogger class created
- [ ] JSON formatting working
- [ ] Log methods implemented:
  - [ ] log_auth() for login/logout/2fa
  - [ ] log_access() for resource access
  - [ ] log_error() for errors
- [ ] Update `/login` route to use logger
- [ ] Update protected routes to log access

### Testing
```bash
□ Login successful: Check logs for JSON
  {
    "timestamp": "2024-01-15T10:30:00Z",
    "event_type": "AUTH",
    "action": "login",
    "user_id": "u_123",
    "status": "success"
  }

□ Access resource: Check logs for access event
□ Unauthorized access: Check for access_denied event
□ Failed login: Check for failed_login event with IP
```

### Integration
- [ ] All auth endpoints logging
- [ ] All GET/PUT/DELETE endpoints logging access
- [ ] Error logging for exceptions
- [ ] No sensitive data in logs (passwords, tokens)

### Code Review
- [ ] Log output format correct
- [ ] No PII in logs
- [ ] Performance impact minimal
- [ ] Logs parseable (valid JSON)

### Deployment
- [ ] Logs visible on staging
- [ ] Setup log rotation/retention
- [ ] Document log format for team
- [ ] Deployed to staging

---

## 🔧 DAY 6: CORS CONFIG (Backend Dev)

### Configuration
```bash
□ Read ALLOWED_ORIGINS from environment
□ Default to http://localhost:5173
□ Split by comma if multiple
□ Strip whitespace
```

### Code Changes
- [ ] Update `main.py` CORS middleware
- [ ] Remove hardcoded origin
- [ ] Add environment variable logic
- [ ] Log allowed origins on startup

### Configuration Files
- [ ] Update `.env`:
  - [ ] ALLOWED_ORIGINS=http://localhost:5173
- [ ] Update `docker-compose.yml`:
  - [ ] Add ALLOWED_ORIGINS environment variable
- [ ] Document for production:
  - [ ] ALLOWED_ORIGINS=https://k-planer.com (example)

### Testing
```bash
□ Local dev: ALLOWED_ORIGINS=http://localhost:5173
  - curl -H "Origin: http://localhost:5173" works ✓
  - curl -H "Origin: http://localhost:3000" fails ✓
  
□ Staging: ALLOWED_ORIGINS=https://staging.k-planer.com
  - Staging origin works ✓
  - Localhost fails ✓
```

### Code Review
- [ ] No hardcoded origins
- [ ] Environment variable properly read
- [ ] Backward compatible
- [ ] Production-ready

### Deployment
- [ ] Deployed to staging with ALLOWED_ORIGINS set
- [ ] CORS working correctly
- [ ] No blocking errors

---

## 🔧 DAY 7: RESOURCE OWNERSHIP VALIDATION (Backend Dev)

### Analysis
- [ ] Identify all endpoints that access resources
- [ ] Create list of endpoints to secure:
  - [ ] GET /workspace/{id}
  - [ ] PUT /workspace/{id}
  - [ ] DELETE /workspace/{id}
  - [ ] GET /espace/{id}
  - [ ] PUT /espace/{id}
  - [ ] [Continue for all resources]

### Implementation Pattern
For each endpoint:
```python
# Pattern to follow:
1. Get resource by ID
2. Check if current_user can access:
   - Is owner? OR
   - Is member with access? OR
   - Is admin?
3. If denied: log access_denied + raise 403
4. If allowed: log access_allowed + proceed
```

### Code Changes
- [ ] Add ownership check to GET endpoints
- [ ] Add ownership check to PUT endpoints
- [ ] Add ownership check to DELETE endpoints
- [ ] Verify member access for shared resources
- [ ] Log access denials with IP/user/resource

### Testing
```bash
□ User A can GET their own workspace ✓
□ User A CANNOT GET User B's workspace ✓
□ User A can GET shared workspace they're member of ✓
□ Admin CAN access all workspaces ✓
□ Anonymous CANNOT access any workspace ✓

□ Same tests for PUT (edit) ✓
□ Same tests for DELETE (remove) ✓
```

### Code Review
- [ ] All endpoints have ownership checks
- [ ] No bypass vulnerabilities
- [ ] Permissions logic correct
- [ ] Access logging in place

### Deployment
- [ ] Integration tests passing
- [ ] Deployed to staging
- [ ] Monitored for 403 errors

---

## 🔧 DAY 8: FRONTEND DOMPURIFY (Frontend Dev)

### Setup
```bash
□ cd frontend
□ npm install dompurify
□ npm install -D @types/dompurify
□ npm list dompurify (verify installed)
```

### Implementation
- [ ] Create `frontend/src/utils/sanitize.ts`
- [ ] Export functions:
  - [ ] sanitizeHtml()
  - [ ] sanitizeText()
  - [ ] sanitizeUrl()

### Component Updates
Identify components displaying user content:
- [ ] ProfileCard
- [ ] TaskDescription
- [ ] CommentList
- [ ] [Others with dangerouslySetInnerHTML]

For each component:
```tsx
□ Add import { sanitizeHtml } from '../utils/sanitize'
□ Replace dangerouslySetInnerHTML value with sanitizeHtml()
□ Test output in browser
□ Verify formatting still works
```

### Testing
```bash
□ XSS payload test:
  Input: <img src=x onerror="alert('XSS')" />
  Output: <img src="x" /> (no onerror)
  
□ Safe content test:
  Input: <b>Bold</b> <i>italic</i>
  Output: <b>Bold</b> <i>italic</i> (preserved)
  
□ Link test:
  Input: <a href="https://example.com">link</a>
  Output: <a href="https://example.com">link</a> (preserved)
```

### Code Review
- [ ] DOMPurify integrated correctly
- [ ] All user content sanitized
- [ ] No performance regression
- [ ] XSS tests pass

### Deployment
- [ ] npm run build (no errors)
- [ ] Deployed to staging
- [ ] Visual regression testing passed

---

## 🔧 DAY 9: TESTING & VALIDATION (Both Devs)

### Database Migrations
```bash
□ Backup production database (if applicable)
□ Run migrations on staging
□ Verify new columns exist:
  □ failed_login_attempts
  □ locked_until
  □ last_login
  □ last_failed_login
□ Check for migration errors
□ Rollback test (restore from backup)
```

### End-to-End Security Test
```bash
AUTHENTICATION
□ Register new user: works ✓
□ Login with correct password: works ✓
□ Login with wrong password: fails ✓
□ Rate limiting: 5 attempts, 6th blocked ✓
□ Account lockout: locked after 5 failures ✓
□ 2FA setup: works ✓
□ 2FA verification: works ✓
□ Logout: tokens blacklisted ✓

ACCESS CONTROL
□ User A cannot access User B's workspace ✓
□ Admin can access all workspaces ✓
□ Members can access shared workspaces ✓
□ Ownership checks logged ✓

HEADERS
□ All security headers present ✓
□ CSP allows required scripts ✓
□ HSTS max-age correct ✓

LOGGING
□ Auth events logged to JSON ✓
□ Access events logged to JSON ✓
□ IP addresses captured ✓
□ Timestamps accurate ✓
```

### Performance Testing
```bash
□ Security headers don't slow response: <5ms overhead
□ Rate limiting doesn't slow response: <5ms overhead
□ Logging doesn't slow response: <10ms overhead
□ Total overhead: <20ms acceptable
```

### Security Scanning
```bash
□ Run curl to check headers
□ Run OWASP ZAP (quick scan) on staging
□ Fix any new issues found
□ Document any false positives
```

### Code Review
- [ ] Final code review of all changes
- [ ] No TODO comments left
- [ ] Documentation updated
- [ ] Tests passing (unit + integration)

---

## 🔧 DAY 10: DEPLOYMENT & MONITORING (Both Devs)

### Pre-Deployment Checklist
```bash
□ All branches merged to main
□ All tests passing
□ Security scanning clean
□ Database migrations tested
□ Rollback plan reviewed
□ Monitoring alerts configured
□ Team notified of deployment
□ Maintenance window scheduled (if needed)
```

### Production Deployment
```bash
□ Create deployment PR
□ Code review approved
□ Merge to main branch
□ Tag release: v1.0.1-security-hardening
□ Build Docker images
□ Push to registry
□ Update production environment variables
□ Deploy to production (blue-green recommended)
```

### Post-Deployment Validation
```bash
□ Application responds: 200 OK
□ Security headers visible in production
□ Logs appearing in output
□ Database migrations applied
□ No error alerts in monitoring
□ Sample logins successful
□ Rate limiting working
```

### Monitoring Setup
```bash
□ Setup log aggregation (Datadog/ELK)
□ Create alerts for:
  □ Failed login attempts spike
  □ Unauthorized access attempts spike
  □ HTTP 429 rate limit hits
  □ Database errors
  □ Application errors
□ Create dashboard for:
  □ Auth events timeline
  □ Access control violations
  □ Rate limit hits by IP
  □ System health metrics
```

### Documentation & Handoff
```bash
□ Update CHANGELOG.md with changes
□ Update README with new features (rate limiting, logging)
□ Document log format for support team
□ Train support team on new account lockout feature
□ Create user communication (password policy changes)
□ Document rollback procedure
```

---

## ✅ POST-PHASE-1 VALIDATION

### Update OWASP Scorecard
```
BEFORE Phase 1:  4/10 🔴
AFTER Phase 1:   7/10 🟠

Improvements:
- A04 Design: 20% → 85%
- A05 Config: 30% → 75%
- A07 Auth: 40% → 80%
- A09 Logging: 0% → 85%
```

### Stakeholder Communication
- [ ] Present results to management
- [ ] Update security dashboard
- [ ] Document lessons learned
- [ ] Schedule Phase 2 kickoff

### Team Reflection
- [ ] Team retrospective (1 hour)
- [ ] What went well?
- [ ] What was difficult?
- [ ] How to improve Phase 2?
- [ ] Update processes if needed

---

## 📊 QUICK STATUS REFERENCE

Print this and check off daily:

```
PHASE 1 STATUS

DAY 1: Security Headers
├─ Middleware created: □
├─ Headers configured: □
├─ Tests passing: □
└─ Deployed: □

DAY 2: Rate Limiting (cont)
├─ Redis setup: □
├─ Limiter configured: □
├─ Tests passing: □
└─ Deployed: □

DAY 3: Rate Limiting (cont)
├─ Login logic updated: □
├─ Failed attempts tracked: □
├─ Account lockout working: □
└─ Deployed: □

DAY 4: Account Lockout (cont)
├─ Model updated: □
├─ Migration created: □
├─ Tests passing: □
└─ Deployed: □

DAY 5: Logging
├─ Logger framework: □
├─ Auth events logging: □
├─ Access logging: □
└─ Deployed: □

DAY 6: CORS Config
├─ Environment reading: □
├─ CORS updated: □
├─ Tests passing: □
└─ Deployed: □

DAY 7: Ownership Checks
├─ All endpoints checked: □
├─ Authorization added: □
├─ Tests passing: □
└─ Deployed: □

DAY 8: Frontend Security
├─ DOMPurify installed: □
├─ Components updated: □
├─ Tests passing: □
└─ Deployed: □

DAY 9: E2E Testing
├─ All tests passing: □
├─ Performance OK: □
├─ Security scan clean: □
└─ Ready for production: □

DAY 10: Production Deploy
├─ Final deployment: □
├─ Monitoring configured: □
├─ Validation complete: □
└─ SUCCESS! 🎉
```

---

**Phase 1 Deployment Checklist - END**

**Next:** Start Phase 2 planning after 1 week for feedback collection.
