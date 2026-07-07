# 🔐 SECURITY REMEDIATION GUIDE - K-PLANER
## Detailed Fixes by File and Category

---

## 1. BACKEND SECURITY IMPROVEMENTS

### 📄 File: `backend/api_gateway/core/security.py`

#### ❌ Issue #1: In-Memory Token Blacklist
**Severity:** CRITICAL  
**Current Code (Lines 37-45):**
```python
token_blacklist = set()

def add_to_blacklist(token: str):
    """Ajoute un token à la blacklist"""
    token_blacklist.add(token)
    logger.info(f"Token ajouté à la blacklist")

def is_token_blacklisted(token: str) -> bool:
    """Vérifie si un token est blacklisté"""
    return token in token_blacklist
```

**Problem:** Lost on restart, no TTL management, memory leak risk

**✅ Fix:**
```python
import redis.asyncio as redis
from datetime import datetime, timedelta

redis_client = None

async def init_redis():
    """Initialize Redis connection"""
    global redis_client
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = redis.from_url(redis_url, decode_responses=True)

def add_to_blacklist(token: str):
    """Add token to Redis blacklist with automatic expiration"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        
        if exp:
            ttl = int(exp - datetime.utcnow().timestamp())
            if ttl > 0:
                # Use asyncio.create_task to avoid blocking
                asyncio.create_task(
                    redis_client.setex(
                        f"blacklist:token:{token[:20]}",
                        ttl,
                        "revoked"
                    )
                )
                logger.info(f"Token added to Redis blacklist with TTL: {ttl}s")
    except JWTError as e:
        logger.error(f"Error decoding token for blacklist: {e}")

async def is_token_blacklisted(token: str) -> bool:
    """Check if token is in Redis blacklist"""
    if not redis_client:
        return False
    
    try:
        result = await redis_client.exists(f"blacklist:token:{token[:20]}")
        return result > 0
    except Exception as e:
        logger.error(f"Error checking token blacklist: {e}")
        return False

# Initialize in startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    yield
    if redis_client:
        await redis_client.close()
```

#### ❌ Issue #2: No Password Complexity Validation
**Severity:** HIGH

**✅ Fix:**
```python
import re

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets complexity requirements:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter  
    - At least one digit
    - At least one special character
    """
    
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    special_chars = r'[!@#$%^&*(),.?":{}|<>]'
    if not re.search(special_chars, password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is valid"

async def check_password_breach(password: str) -> bool:
    """Check if password has been compromised using haveibeenpwned API"""
    import hashlib
    import aiohttp
    
    try:
        # Hash password with SHA-1
        sha1_hash = hashlib.sha1(password.encode()).hexdigest().upper()
        prefix = sha1_hash[:5]
        suffix = sha1_hash[5:]
        
        # Query API
        async with aiohttp.ClientSession() as session:
            url = f"https://api.pwnedpasswords.com/range/{prefix}"
            async with session.get(url, timeout=5) as response:
                if response.status == 200:
                    hashes = await response.text()
                    return suffix in hashes.upper()
    except Exception as e:
        logger.warning(f"Could not check password breach: {e}")
        # Fail-open: allow password if check fails
        return False
    
    return False

# Use in registration/password change routes
@router.post("/register")
async def register(request: RegisterRequest, db: Session):
    # Validate password strength
    is_valid, message = validate_password_strength(request.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Check against known breaches
    if await check_password_breach(request.password):
        raise HTTPException(
            status_code=400,
            detail="This password has been compromised in known data breaches. Choose another."
        )
    
    # Continue with registration...
```

#### ❌ Issue #3: No Account Lockout Mechanism
**Severity:** CRITICAL

**✅ Fix:**
```python
class LoginAttemptTracker:
    """Track failed login attempts for brute force protection"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.max_attempts = 5
        self.lockout_duration = 900  # 15 minutes
        self.attempt_window = 900  # 15 minute window
    
    async def record_failed_attempt(self, identifier: str, ip: str) -> dict:
        """Record a failed login attempt"""
        key = f"login:failed:{identifier}"
        ip_key = f"login:ip:{ip}"
        
        failed_count = await self.redis.incr(key)
        await self.redis.expire(key, self.attempt_window)
        
        await self.redis.incr(ip_key)
        await self.redis.expire(ip_key, self.attempt_window)
        
        return {
            "attempts": failed_count,
            "max_attempts": self.max_attempts,
            "locked_out": failed_count >= self.max_attempts
        }
    
    async def is_locked_out(self, identifier: str) -> bool:
        """Check if user is locked out"""
        key = f"login:locked:{identifier}"
        return await self.redis.exists(key) > 0
    
    async def lock_account(self, identifier: str):
        """Lock account after too many failed attempts"""
        key = f"login:locked:{identifier}"
        await self.redis.setex(key, self.lockout_duration, "locked")
        
        logger.warning(f"Account locked for {identifier} - too many failed attempts")
        security_logger.log_auth(
            action="account_locked",
            user_id=identifier,
            ip="unknown",
            status="locked",
            details={"reason": "too_many_failed_attempts"}
        )
    
    async def clear_failed_attempts(self, identifier: str):
        """Clear failed attempts after successful login"""
        key = f"login:failed:{identifier}"
        await self.redis.delete(key)

# Use in login endpoint
login_tracker = LoginAttemptTracker(redis_client)

@router.post("/login")
async def login(request: LoginRequest, db: Session):
    identifier = request.identifier
    ip_address = request.client.host
    
    # Check if account is locked
    if await login_tracker.is_locked_out(identifier):
        security_logger.log_auth(
            action="login_attempt_locked_account",
            user_id=identifier,
            ip=ip_address,
            status="failed"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account locked due to too many failed login attempts. Try again in 15 minutes."
        )
    
    # Attempt login
    user = db.query(Utilisateur).filter(
        Utilisateur.email == identifier
    ).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        # Record failed attempt
        result = await login_tracker.record_failed_attempt(identifier, ip_address)
        
        if result["locked_out"]:
            await login_tracker.lock_account(identifier)
            security_logger.log_auth(
                action="account_locked_after_failures",
                user_id=identifier,
                ip=ip_address,
                status="locked"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Account locked. Too many failed attempts."
            )
        
        # Same message for user enumeration protection
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Clear failed attempts on success
    await login_tracker.clear_failed_attempts(identifier)
    
    # Generate tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    security_logger.log_auth(
        action="login_success",
        user_id=str(user.id),
        ip=ip_address,
        status="success"
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UtilisateurOut.from_orm(user)
    }
```

---

### 📄 File: `backend/api_gateway/main.py`

#### ❌ Issue #1: No CSRF Protection
**Severity:** CRITICAL

**✅ Fix - Add CSRF Middleware:**
```python
# Add to imports
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import secrets

# Add middleware class
class CSRFMiddleware(BaseHTTPMiddleware):
    """Protect against Cross-Site Request Forgery attacks"""
    
    SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
    CSRF_COOKIE_NAME = "csrf_token"
    CSRF_HEADER_NAME = "x-csrf-token"
    
    async def dispatch(self, request: Request, call_next):
        # For safe methods, just ensure CSRF token exists
        if request.method in self.SAFE_METHODS:
            response = await call_next(request)
            
            # Add CSRF token cookie if not present
            if not request.cookies.get(self.CSRF_COOKIE_NAME):
                token = secrets.token_urlsafe(32)
                response.set_cookie(
                    self.CSRF_COOKIE_NAME,
                    token,
                    httponly=False,  # JavaScript needs to read it
                    secure=True,  # HTTPS only
                    samesite="strict",  # CSRF protection
                    max_age=3600  # 1 hour
                )
            
            return response
        
        # For unsafe methods (POST, PUT, DELETE, PATCH), verify CSRF token
        if request.method not in self.SAFE_METHODS:
            # Get token from request
            token_from_request = (
                request.headers.get(self.CSRF_HEADER_NAME) or
                request.query_params.get("csrf_token")
            )
            
            # Get token from cookie
            token_from_cookie = request.cookies.get(self.CSRF_COOKIE_NAME)
            
            # Verify tokens match
            if not token_from_request or token_from_request != token_from_cookie:
                security_logger.log_error(
                    error_type="csrf_validation_failed",
                    message="CSRF token validation failed",
                    details={
                        "method": request.method,
                        "path": str(request.url.path),
                        "ip": request.client.host if request.client else "unknown"
                    }
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token validation failed"
                )
        
        response = await call_next(request)
        return response

# Add middleware to app BEFORE other middleware
app.add_middleware(CSRFMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
```

#### ❌ Issue #2: Rate Limiting Not on Auth Endpoints
**Severity:** HIGH

**✅ Fix:**
```python
# Add stricter limiter for auth endpoints
@router.post("/auth/login", dependencies=[Depends(RateLimiter(max_requests=5, window_seconds=60))])
async def login(request: LoginRequest, db: Session):
    # Implementation...
    pass

@router.post("/auth/register", dependencies=[Depends(RateLimiter(max_requests=3, window_seconds=300))])
async def register(request: RegisterRequest, db: Session):
    # Implementation...
    pass

@router.post("/auth/forgot-password", dependencies=[Depends(RateLimiter(max_requests=3, window_seconds=600))])
async def forgot_password(request: ForgotPasswordRequest, db: Session):
    # Implementation...
    pass
```

---

### 📄 File: `backend/api_gateway/routes/auth.py`

#### ❌ Issue: User Enumeration Possible
**Severity:** HIGH

**✅ Fix:**
```python
@router.post("/login")
async def login(request: LoginRequest, db: Session):
    # Always return same message to prevent user enumeration
    generic_error = "Invalid credentials"
    
    # Check in database
    user = db.query(Utilisateur).filter(
        (Utilisateur.email == request.identifier) |
        (Utilisateur.username == request.identifier)
    ).first()
    
    if not user:
        # Log but don't reveal that user doesn't exist
        security_logger.log_error(
            error_type="login_user_not_found",
            message="Login attempt for non-existent user",
            details={"identifier": "***REDACTED***"}
        )
        # Return generic error
        raise HTTPException(status_code=401, detail=generic_error)
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        security_logger.log_auth(
            action="login_failed_invalid_password",
            user_id=str(user.id),
            ip=request.client.host if request.client else "unknown",
            status="failed"
        )
        # Return SAME generic error
        raise HTTPException(status_code=401, detail=generic_error)
    
    # Check if user is active
    if not user.is_active:
        security_logger.log_auth(
            action="login_failed_inactive_user",
            user_id=str(user.id),
            ip=request.client.host if request.client else "unknown",
            status="failed"
        )
        # Still return generic error to not reveal user exists but is inactive
        raise HTTPException(status_code=401, detail=generic_error)
    
    # Continue with 2FA or token generation...
```

---

## 2. FRONTEND SECURITY IMPROVEMENTS

### 📄 File: `frontend/src/services/api.ts`

#### ✅ Issue #1: Add CSRF Token to Requests
**Severity:** CRITICAL

**Current Code (Lines 180-200):**
```typescript
const headers: HeadersInit = {
  ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
  ...(token && { Authorization: `Bearer ${token}` }),
  ...options?.headers,
};
```

**✅ Fix:**
```typescript
export async function apiFetch(
  baseUrl: string,
  endpoint: string,
  options?: RequestInit
) {
  const sanitizedEndpoint = sanitizeUrl(endpoint);
  
  const token = localStorage.getItem('access_token');
  const method = (options?.method || 'GET').toUpperCase();
  const isFormData = options?.body instanceof FormData;
  
  // Get CSRF token from cookie
  const getCsrfToken = (): string | null => {
    const cookies = document.cookie.split('; ');
    const csrfCookie = cookies.find(c => c.startsWith('csrf_token='));
    return csrfCookie ? csrfCookie.split('=')[1] : null;
  };
  
  const csrfToken = getCsrfToken();
  
  const headers: HeadersInit = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token && { Authorization: `Bearer ${token}` }),
    // Add CSRF token for state-changing requests
    ...(method !== 'GET' && csrfToken && { 'X-CSRF-Token': csrfToken }),
    ...options?.headers,
  };
  
  // Rest of implementation...
}
```

### 📄 File: `frontend/src/contexts/AuthContext.tsx`

#### ✅ Issue #1: Move Access Token from localStorage to Cookie
**Severity:** HIGH

**Current Code (Line 79-81):**
```typescript
localStorage.setItem('access_token', response.access_token);
setToken(response.access_token);
setUser(response.user);
```

**✅ Fix:**
```typescript
// For access token, use the cookie set by the backend
// For temporary storage, use SessionStorage (cleared on browser close)

const login = async (identifier: string, password: string) => {
  const response = await authService.login(identifier, password);
  
  if (response.requires_2fa) {
    return { requires2fa: true, challengeToken: response.challenge_token };
  }

  if (!response.access_token || !response.user) {
    throw new Error('Invalid login response.');
  }
  
  // Store token in memory only (cleared on page refresh)
  // Backend will set HttpOnly cookie for refresh token
  setToken(response.access_token);
  setUser(response.user);
  
  // Optional: Store in SessionStorage as fallback (not localStorage)
  sessionStorage.setItem('access_token_backup', response.access_token);
  
  return { requires2fa: false };
};

// In logout
const logout = async () => {
  try {
    await authService.logout();
  } catch (error) {
    console.error('Error during logout', error);
  }
  
  // Clear in-memory token
  setToken(null);
  setUser(null);
  
  // Clear session storage
  sessionStorage.removeItem('access_token_backup');
  
  navigate('/login?logout=true');
};
```

#### ✅ Issue #2: Extend Session Warning
**Severity:** MEDIUM

**✅ Fix:**
```typescript
import { useEffect } from 'react';
import { toast } from '../components/ui/Toast';

export function AuthProvider({ children }: { children: ReactNode }) {
  // ... existing code ...
  
  useEffect(() => {
    if (!token) return;

    // Access token expires in 30 minutes
    // Warn user at 25 minutes
    const warningTimeout = setTimeout(() => {
      toast.warning(
        "Your session is about to expire in 5 minutes. " +
        "Click here to stay logged in.",
        {
          duration: 0,  // Don't auto-dismiss
          onClick: async () => {
            try {
              // Refresh token via the refresh endpoint
              const newToken = await authService.refreshToken();
              setToken(newToken.access_token);
              toast.success("Session extended!");
            } catch (error) {
              console.error("Failed to refresh session", error);
              logout();
            }
          }
        }
      );
    }, 25 * 60 * 1000);  // 25 minutes
    
    // Auto-logout at 30 minutes if not refreshed
    const logoutTimeout = setTimeout(() => {
      logout();
      toast.error("Your session has expired. Please log in again.");
    }, 30 * 60 * 1000);  // 30 minutes

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(logoutTimeout);
    };
  }, [token]);
  
  // ... rest of implementation ...
}
```

---

### 📄 File: `frontend/src/pages/LoginPage.tsx`

#### ✅ Issue #1: Prevent User Enumeration
**Severity:** HIGH

**Current Code (Lines 30-45):**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const result = await login(identifier, password);
    if (result.requires2fa) {
      setRequires2fa(true);
      setChallengeToken(result.challengeToken!);
    } else {
      if (invitationToken) {
        navigate(`/invitation/accept?token=${encodeURIComponent(invitationToken)}`);
      } else {
        navigate('/dashboard');
      }
    }
  } catch (err) {
    const message = sanitizeApiErrorMessage(err, 'Erreur de connexion');
    // ...
```

**✅ Fix:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate input format
  if (!identifier || !password) {
    toast.error("Please enter both email and password");
    return;
  }
  
  try {
    const result = await login(identifier, password);
    
    if (result.requires2fa) {
      setRequires2fa(true);
      setChallengeToken(result.challengeToken!);
    } else {
      if (invitationToken) {
        navigate(`/invitation/accept?token=${encodeURIComponent(invitationToken)}`);
      } else {
        navigate('/dashboard');
      }
    }
  } catch (err) {
    // GENERIC error message - don't reveal if user exists
    const message = sanitizeApiErrorMessage(err, 'Invalid credentials');
    
    // Check for SPECIFIC errors that should show details
    const errorStr = String(err);
    
    if (errorStr.includes('email n\'est pas encore verifiee')) {
      // This is OK to show - user just needs to verify email
      const emailMatch = identifier.match(/[^@]+@[^@]+\.[^@]+/);
      const emailToUse = emailMatch ? emailMatch[0] : identifier;
      toast.info('Please verify your email address before logging in.');
      navigate(`/verify-email?email=${encodeURIComponent(emailToUse)}`);
    } else if (errorStr.includes('account locked')) {
      // Account lockout is OK to show
      toast.error('Account locked due to too many failed attempts. Try again in 15 minutes.');
    } else {
      // For all other errors, use generic message
      toast.error('Invalid credentials');
    }
  }
};
```

---

### 📄 File: `frontend/src/pages/RegisterPage.tsx`

#### ✅ Issue #1: Strong Password Validation
**Severity:** HIGH

**Current Code (Lines 56-60):**
```typescript
const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;

if (!usernameRegex.test(username)) {
  toast.error("Le nom d'utilisateur doit contenir 3 à 30 caractères : lettres, chiffres, point, tiret ou underscore uniquement.");
  return;
}

if (form.password.length < 8) {
  toast.error('Le mot de passe doit contenir au moins 8 caractères.');
  return;
}
```

**✅ Fix:**
```typescript
const validateRegistration = (username: string, email: string, password: string): string | null => {
  // Validate username
  const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;
  if (!usernameRegex.test(username)) {
    return "Username must be 3-30 characters (letters, numbers, dots, dashes, underscores only).";
  }
  
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email address.";
  }
  
  // Validate password STRENGTH
  if (password.length < 12) {
    return "Password must be at least 12 characters.";
  }
  
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter (A-Z).";
  }
  
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter (a-z).";
  }
  
  if (!/\d/.test(password)) {
    return "Password must contain at least one digit (0-9).";
  }
  
  const specialChars = /[!@#$%^&*(),.?":{}|<>]/;
  if (!specialChars.test(password)) {
    return "Password must contain at least one special character (!@#$%^&*...).";
  }
  
  return null;  // All validations passed
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Sanitize inputs
  const username = sanitizeInput(form.username.trim());
  const email = sanitizeInput(form.email.trim().toLowerCase());

  // Validate all fields
  const validationError = validateRegistration(username, email, form.password);
  if (validationError) {
    toast.error(validationError);
    return;
  }

  try {
    const registerData = {
      username,
      email,
      password: form.password,
      ...(invitationToken ? { invitation_token: invitationToken } : {}),
      is_entreprise: false,
    };

    await register(registerData);
    sessionStorage.removeItem('pendingInvitation');
    toast.success('Registration successful! Check your email for verification code.');
    navigate(`/verify-email?email=${encodeURIComponent(email)}`);
  } catch (err) {
    toast.error(sanitizeApiErrorMessage(err, 'Registration failed'));
  }
};
```

---

### 📄 File: `frontend/index.html`

#### ✅ Issue: Add Subresource Integrity (SRI) to CDN Scripts
**Severity:** MEDIUM

**Current Code:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  ...
" />
```

**✅ Fix:**
```html
<!-- Add SRI to CDN resources -->
<!-- Example for Google Analytics (if used) -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
  integrity="sha384-XXXXXXXXXXXXXXXXXXXXX"
  crossorigin="anonymous"
></script>

<!-- For any external libraries loaded from CDN -->
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css?family=Roboto"
  integrity="sha384-XXXXXXXXXXXXXXXXXXXXX"
  crossorigin="anonymous"
/>

<!-- Update CSP to be stricter -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https: http://localhost:* ws://localhost:* wss://*.k-planer.com;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  upgrade-insecure-requests;
" />
```

---

### 📄 File: `frontend/src/utils/sanitize.ts`

#### ✅ Issue: Add Injection Detection
**Severity:** MEDIUM

**✅ Fix:**
```typescript
import DOMPurify from 'dompurify';

const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'p', 'br', 
    'ul', 'ol', 'li', 'a', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'pre', 'code'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onchange', 'onsubmit'],
};

// Common attack patterns
const INJECTION_PATTERNS = [
  /<script/gi,
  /javascript:/gi,
  /onerror=/gi,
  /onload=/gi,
  /onclick=/gi,
  /onmouseover=/gi,
  /eval\(/gi,
  /expression\(/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /data:text\/html/gi,
];

export const detectInjectionAttempt = (input: string): boolean => {
  if (!input) return false;
  return INJECTION_PATTERNS.some(pattern => pattern.test(input));
};

export const sanitizeHtml = (html: string, config = DEFAULT_CONFIG): string => {
  if (!html) return '';
  
  // First check for injection attempts
  if (detectInjectionAttempt(html)) {
    console.warn('Potential injection attempt detected');
    return DOMPurify.sanitize('', config);  // Return empty
  }
  
  return DOMPurify.sanitize(html, config);
};

export const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  // Detect injection attempts
  if (detectInjectionAttempt(text)) {
    console.warn('Potential injection attempt detected in text');
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    
    // Whitelist allowed protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    
    // Detect common XSS in URLs
    if (detectInjectionAttempt(url)) {
      return '';
    }
    
    return url;
  } catch {
    return '';
  }
};

export const sanitizeInput = <T>(data: T): T => {
  if (typeof data === 'string') {
    // Check for injection
    if (detectInjectionAttempt(data)) {
      return '' as T;
    }
    return sanitizeText(data) as T;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput) as T;
  }
  
  if (data && typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeInput(value);
    }
    return result;
  }
  
  return data;
};

// Validate against known bad patterns in JSON
export const validateJsonData = (data: any): boolean => {
  const jsonString = JSON.stringify(data);
  return !detectInjectionAttempt(jsonString);
};
```

---

## 3. DEPLOYMENT & INFRASTRUCTURE

### 📄 Environment Configuration

#### ✅ `.env` Best Practices

```bash
# ✅ SECURE CONFIGURATION

# Environment
ENV=Production

# Security
SECRET_KEY=<generate-strong-random-key>
ALGORITHM=HS512  # Use HS512 instead of HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15  # Reduce from 30
REFRESH_TOKEN_EXPIRE_DAYS=7     # Reduce from 30

# Redis (for persistent token blacklist)
REDIS_URL=redis://redis-host:6379/0

# CORS (be specific)
ALLOW_ORIGINS=https://app.k-planer.com,https://www.k-planer.com

# API Versioning
API_VERSION=v1

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Security Headers
HSTS_MAX_AGE=31536000
```

#### ✅ Generate Strong SECRET_KEY

```python
# security_setup.py
import secrets
import base64

# Generate strong SECRET_KEY
secret_key = secrets.token_urlsafe(32)
print(f"SECRET_KEY={secret_key}")

# Test in .env
SECRET_KEY = secrets.token_urlsafe(32)  # 32 bytes = 256 bits
```

---

### 📄 Docker Security

#### ✅ Secure Dockerfile

```dockerfile
# Dockerfile
FROM python:3.11-slim-bullseye

WORKDIR /app

# Install security tools
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/api_gateway/requirements.txt .

# Install dependencies with hash checking
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/api_gateway .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Run with security flags
CMD ["uvicorn", "main:app", \
  "--host", "0.0.0.0", \
  "--port", "8000", \
  "--ssl-keyfile", "/run/secrets/ssl_key", \
  "--ssl-certfile", "/run/secrets/ssl_cert"]
```

---

### 📄 Docker Compose Security

```yaml
# docker-compose.yml
version: '3.8'

services:
  api_gateway:
    image: k-planer-api-gateway:latest
    container_name: api-gateway
    environment:
      ENV: Production
      SECRET_KEY: ${SECRET_KEY}
      REDIS_URL: redis://redis:6379
    ports:
      - "8002:8002"
    secrets:
      - ssl_key
      - ssl_cert
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - secure_network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: redis-cache
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - secure_network
    restart: unless-stopped

secrets:
  ssl_key:
    file: ./certs/private.key
  ssl_cert:
    file: ./certs/certificate.crt

volumes:
  redis_data:

networks:
  secure_network:
    driver: bridge
```

---

## 4. TESTING CHECKLIST

### ✅ Security Testing Checklist

```bash
# 1. Dependency Audit
npm audit --audit-level=moderate
npm audit fix
pip install safety
safety check

# 2. CSRF Token Testing
curl -X POST http://localhost:8002/api/data \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}' \
  # Should return 403 without CSRF token

# 3. Rate Limiting Test
for i in {1..10}; do
  curl http://localhost:8002/auth/login \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"identifier":"user@test.com","password":"pass"}'
done
# Should return 429 after 5 attempts

# 4. Password Policy Test
# Test passwords and verify all constraints are enforced

# 5. XSS Protection Test
# Submit: <script>alert('xss')</script>
# Should be sanitized

# 6. SQL Injection Test (use SQL map)
sqlmap -u "http://localhost:8002/api/users?id=1" --dbs

# 7. HTTPS Redirect
curl -I http://k-planer.com
# Should redirect to https

# 8. Security Headers Check
curl -I https://k-planer.com
# Verify: CSP, HSTS, X-Frame-Options, etc.

# 9. JWT Expiration Test
# Wait for token to expire, try to use it
# Should receive 401

# 10. CORS Test
curl -X OPTIONS http://localhost:8002/api/users \
  -H "Origin: http://attacker.com"
# Should NOT include attacker.com in Access-Control-Allow-Origin
```

---

## 📊 Summary of Changes

| Area | Issue | Severity | Fix | Effort |
|------|-------|----------|-----|--------|
| Backend | Token Blacklist | CRITICAL | Move to Redis | 2h |
| Backend | Password Policy | HIGH | Add complexity validation | 1h |
| Backend | Account Lockout | CRITICAL | Implement tracker | 2h |
| Backend | User Enumeration | HIGH | Generic error messages | 1h |
| Backend | Rate Limiting | HIGH | Stricter auth limits | 30m |
| Frontend | CSRF Protection | CRITICAL | Add middleware + tokens | 3h |
| Frontend | Token Storage | HIGH | Use HttpOnly cookies | 2h |
| Frontend | Session Warning | MEDIUM | Add timeout alerts | 1h |
| Frontend | Password Validation | HIGH | Strengthen requirements | 1h |
| Frontend | Input Sanitization | MEDIUM | Add injection detection | 1h |

**Total Implementation Time: ~15 hours**

---

**Next Steps:**
1. Prioritize CRITICAL items (15 hours total)
2. Test thoroughly in staging environment
3. Deploy to production with monitoring
4. Document all changes
5. Schedule follow-up audit in 3 months
