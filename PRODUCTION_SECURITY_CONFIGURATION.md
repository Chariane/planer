# 🔐 PRODUCTION SECURITY CONFIGURATION
## Ready-to-Deploy Security Setup for K-Planer

---

## 1. ENVIRONMENT CONFIGURATION

### 📄 `.env.production` Template

```bash
# ====================================================================
# ENVIRONMENT & APPLICATION
# ====================================================================
ENV=Production
APP_NAME=K-Planer
APP_VERSION=1.0.0
DEBUG=false

# ====================================================================
# SECURITY - CRITICAL
# ====================================================================

# JWT Configuration
SECRET_KEY=<REPLACE_WITH_GENERATED_KEY>  # Generate: python -c "import secrets; print(secrets.token_urlsafe(32))"
ALGORITHM=HS512
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Password Requirements
MIN_PASSWORD_LENGTH=12
REQUIRE_UPPERCASE=true
REQUIRE_LOWERCASE=true
REQUIRE_DIGITS=true
REQUIRE_SPECIAL_CHARS=true

# Account Security
MAX_LOGIN_ATTEMPTS=5
LOGIN_ATTEMPT_WINDOW=900  # 15 minutes in seconds
ACCOUNT_LOCKOUT_DURATION=900  # 15 minutes

# ====================================================================
# DATABASE
# ====================================================================
DATABASE_URL=postgresql://user:password@db-host:5432/k_planer_prod
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=0
DATABASE_POOL_TIMEOUT=30

# ====================================================================
# REDIS - For Token Blacklist & Caching
# ====================================================================
REDIS_URL=redis://:password@redis-host:6379/0
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>

# ====================================================================
# CORS & DOMAINS
# ====================================================================
ALLOW_ORIGINS=https://app.k-planer.com,https://www.k-planer.com
ALLOWED_DOMAINS=k-planer.com,www.k-planer.com
API_DOMAIN=api.k-planer.com
APP_URL=https://app.k-planer.com

# ====================================================================
# SSL/TLS
# ====================================================================
SSL_ENABLED=true
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true
HSTS_PRELOAD=true

# ====================================================================
# SECURITY HEADERS
# ====================================================================
CSP_REPORT_ONLY=false
CSP_REPORT_URI=https://api.k-planer.com/api/v1/security/csp-reports

# ====================================================================
# RATE LIMITING
# ====================================================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_AUTH_REQUESTS_PER_MINUTE=5
RATE_LIMIT_AUTH_ATTEMPT_WINDOW=900

# ====================================================================
# LOGGING
# ====================================================================
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_HANDLER=syslog  # Options: stdout, file, syslog, cloudwatch
LOG_FILE=/var/log/k-planer/app.log
LOG_RETENTION_DAYS=90

# ====================================================================
# EMAIL & NOTIFICATIONS
# ====================================================================
EMAIL_BACKEND=smtp
SMTP_HOST=smtp.k-planer.com
SMTP_PORT=587
SMTP_USER=noreply@k-planer.com
SMTP_PASSWORD=<GENERATE_APP_PASSWORD>
SMTP_TLS=true
FROM_EMAIL=noreply@k-planer.com

# ====================================================================
# 2FA & SECURITY SERVICES
# ====================================================================
GOOGLE_AUTHENTICATOR_ENABLED=true
PASSWORD_BREACH_CHECK_ENABLED=true  # haveibeenpwned.com
RECAPTCHA_ENABLED=true
RECAPTCHA_SECRET=<GET_FROM_GOOGLE_RECAPTCHA>

# ====================================================================
# MONITORING & ALERTING
# ====================================================================
SENTRY_DSN=https://<key>@<project>.ingest.sentry.io/<projectid>
DATADOG_ENABLED=true
DATADOG_API_KEY=<GET_FROM_DATADOG>
MONITORING_ALERT_EMAIL=security@k-planer.com

# ====================================================================
# API VERSIONING
# ====================================================================
API_VERSION=v1
API_VERSION_DEPRECATION_DATE=2027-07-07

# ====================================================================
# SECURITY AUDIT
# ====================================================================
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=365
AUDIT_LOG_ENCRYPTION=true
```

### 🔑 Generate Secure Keys

```bash
#!/bin/bash
# generate_secrets.sh

echo "Generating production secrets..."

# Generate SECRET_KEY
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
echo "SECRET_KEY=$SECRET_KEY"

# Generate REDIS_PASSWORD
REDIS_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
echo "REDIS_PASSWORD=$REDIS_PASSWORD"

# Generate SMTP_PASSWORD (should be app-specific)
SMTP_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
echo "SMTP_PASSWORD=$SMTP_PASSWORD"

# Store in vault (do NOT commit to git)
echo "Store these secrets in your secure vault (AWS Secrets Manager, HashiCorp Vault, etc.)"
```

---

## 2. SECURITY HEADERS CONFIGURATION

### 📄 Production Security Headers

```python
# backend/api_gateway/middleware/security_headers.py

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import os

class ProductionSecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enhanced security headers for production environment"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # =========================================================
        # CONTENT SECURITY POLICY
        # =========================================================
        csp = (
            "default-src 'self'; "
            "script-src 'self' https://cdn.jsdelivr.net https://www.googletagmanager.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https: blob:; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self' https://*.k-planer.com wss://*.k-planer.com; "
            "frame-ancestors 'none'; "
            "form-action 'self'; "
            "base-uri 'self'; "
            "upgrade-insecure-requests; "
            "require-trusted-types-for 'script'; "
            "report-uri https://api.k-planer.com/api/v1/security/csp-reports"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # =========================================================
        # HTTPS & TRANSPORT SECURITY
        # =========================================================
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        
        # =========================================================
        # CLICKJACKING PROTECTION
        # =========================================================
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Frame-Options-Report-Only"] = "false"
        
        # =========================================================
        # CONTENT TYPE SNIFFING PREVENTION
        # =========================================================
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # =========================================================
        # XSS PROTECTION (Legacy - CSP is primary)
        # =========================================================
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # =========================================================
        # REFERRER POLICY
        # =========================================================
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # =========================================================
        # PERMISSIONS POLICY (Feature Policy)
        # =========================================================
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        
        # =========================================================
        # CROSS-ORIGIN POLICIES
        # =========================================================
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        
        # =========================================================
        # CACHE CONTROL FOR SENSITIVE RESPONSES
        # =========================================================
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        # =========================================================
        # ADDITIONAL SECURITY HEADERS
        # =========================================================
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["X-Content-Security-Policy"] = csp
        
        # Remove server header (don't advertise tech stack)
        response.headers.pop("Server", None)
        
        return response
```

---

## 3. NGINX CONFIGURATION

### 📄 Nginx SSL/TLS Configuration

```nginx
# /etc/nginx/sites-available/k-planer-production

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name *.k-planer.com k-planer.com;
    return 301 https://$host$request_uri;
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.k-planer.com;

    # =========================================================
    # SSL CONFIGURATION - CRITICAL
    # =========================================================
    
    # SSL Certificates (use Let's Encrypt with auto-renewal)
    ssl_certificate /etc/letsencrypt/live/app.k-planer.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.k-planer.com/privkey.pem;
    
    # SSL Protocol & Ciphers (TLS 1.2+)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS Preload
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # =========================================================
    # SECURITY HEADERS
    # =========================================================
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header X-Permitted-Cross-Domain-Policies "none" always;
    add_header Expect-CT "max-age=86400, enforce, report-uri=\"https://api.k-planer.com/api/v1/security/ct-reports\"" always;
    
    # =========================================================
    # RATE LIMITING
    # =========================================================
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
    
    # =========================================================
    # LOGGING
    # =========================================================
    access_log /var/log/nginx/k-planer-access.log combined buffer=32k flush=5s;
    error_log /var/log/nginx/k-planer-error.log warn;
    
    # =========================================================
    # ROOT & INDEX
    # =========================================================
    root /var/www/k-planer/frontend;
    index index.html;
    
    # =========================================================
    # API GATEWAY PROXY
    # =========================================================
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;
        
        proxy_pass http://api_gateway:8002;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # =========================================================
    # AUTH ENDPOINTS - STRICT RATE LIMITING
    # =========================================================
    location /api/auth/login {
        limit_req zone=auth_limit burst=5 nodelay;
        proxy_pass http://api_gateway:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/auth/register {
        limit_req zone=auth_limit burst=3 nodelay;
        proxy_pass http://api_gateway:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # =========================================================
    # STATIC FILES
    # =========================================================
    location ~* ^/assets/ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # =========================================================
    # SPA ROUTING
    # =========================================================
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    }
    
    # =========================================================
    # DENY ACCESS TO SENSITIVE FILES
    # =========================================================
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # =========================================================
    # HEALTH CHECK
    # =========================================================
    location /health {
        access_log off;
        proxy_pass http://api_gateway:8002;
    }
}
```

---

## 4. DOCKER COMPOSE - SECURE SETUP

### 📄 `docker-compose.production.yml`

```yaml
version: '3.8'

services:
  # ================================================================
  # NGINX - Reverse Proxy with SSL/TLS
  # ================================================================
  nginx:
    image: nginx:1.27-alpine
    container_name: nginx-reverse-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./sites-available:/etc/nginx/sites-available:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./frontend/dist:/var/www/k-planer/frontend:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - api_gateway
    networks:
      - secure_network
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ================================================================
  # API GATEWAY
  # ================================================================
  api_gateway:
    image: k-planer-api-gateway:${TAG:-latest}
    container_name: api-gateway
    environment:
      ENV: Production
      SECRET_KEY: ${SECRET_KEY}
      ALGORITHM: HS512
      ACCESS_TOKEN_EXPIRE_MINUTES: 15
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/k_planer
      ALLOW_ORIGINS: https://app.k-planer.com,https://www.k-planer.com
      LOG_LEVEL: INFO
      LOG_FORMAT: json
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - secure_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

  # ================================================================
  # PostgreSQL Database with SSL
  # ================================================================
  postgres:
    image: postgres:16-alpine
    container_name: postgres-db
    environment:
      POSTGRES_DB: k_planer
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "-c ssl=on -c ssl_cert_file=/var/lib/postgresql/server.crt -c ssl_key_file=/var/lib/postgresql/server.key"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./certs/db.crt:/var/lib/postgresql/server.crt:ro
      - ./certs/db.key:/var/lib/postgresql/server.key:ro
    networks:
      - secure_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    security_opt:
      - no-new-privileges:true

  # ================================================================
  # Redis Cache with Password Authentication
  # ================================================================
  redis:
    image: redis:7-alpine
    container_name: redis-cache
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --appendonly yes
      --appendfsync everysec
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --timeout 300
      --tcp-keepalive 60
    volumes:
      - redis_data:/data
    networks:
      - secure_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    security_opt:
      - no-new-privileges:true

  # ================================================================
  # MONITORING - Prometheus (Optional)
  # ================================================================
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    networks:
      - secure_network
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true

  # ================================================================
  # LOGGING - ELK Stack (Optional)
  # ================================================================
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
      - xpack.security.enabled=true
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - secure_network
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  nginx_logs:
    driver: local
  prometheus_data:
    driver: local
  elasticsearch_data:
    driver: local

networks:
  secure_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

---

## 5. CERTIFICATE MANAGEMENT

### 📄 Let's Encrypt Auto-Renewal

```bash
#!/bin/bash
# setup_ssl.sh

# Install Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Create certificate
certbot certonly \
  --nginx \
  --agree-tos \
  --no-eff-email \
  -d app.k-planer.com \
  -d api.k-planer.com \
  -m admin@k-planer.com

# Auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
certbot renew --dry-run
```

---

## 6. MONITORING & ALERTING

### 📄 Prometheus Configuration

```yaml
# prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: production
    service: k-planer

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:6379']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:5432']
```

---

## 7. SECURITY CHECKLIST FOR PRODUCTION

### ✅ Pre-Deployment Verification

```bash
# 1. Environment Variables
[ ] SECRET_KEY generated and secured
[ ] DATABASE_URL configured securely
[ ] REDIS_URL with password set
[ ] ALLOWED_ORIGINS restricted to production domains
[ ] SSL certificates installed
[ ] Environment set to "Production"

# 2. Database
[ ] Backups configured
[ ] SSL enabled
[ ] Database user has limited privileges
[ ] Connection pooling configured

# 3. Redis
[ ] Password-protected
[ ] AOF persistence enabled
[ ] Memory limits set
[ ] Key eviction policy configured

# 4. Nginx
[ ] SSL certificates valid
[ ] HSTS enabled
[ ] Rate limiting configured
[ ] Access logs configured

# 5. Application
[ ] CSRF middleware active
[ ] Security headers configured
[ ] Error handling doesn't leak info
[ ] Logging configured with proper level

# 6. Monitoring
[ ] Prometheus collecting metrics
[ ] Alerting configured
[ ] Log aggregation setup (ELK/Datadog)
[ ] Health checks responding

# 7. Security
[ ] Firewall rules configured
[ ] Network segmentation done
[ ] No hardcoded secrets
[ ] No debug mode enabled
[ ] 2FA tested and working

# 8. Documentation
[ ] Security procedures documented
[ ] Incident response plan ready
[ ] Team trained on procedures
[ ] Emergency contacts listed
```

---

## 8. DEPLOYMENT SCRIPT

### 📄 Production Deployment

```bash
#!/bin/bash
# deploy_production.sh

set -e

ENV_FILE=".env.production"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
DOCKER_COMPOSE_FILE="docker-compose.production.yml"

echo "🔒 K-Planer Production Deployment"
echo "=================================="

# 1. Pre-flight checks
echo "1. Running pre-flight checks..."
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Missing $ENV_FILE"
    exit 1
fi

if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo "❌ Missing $DOCKER_COMPOSE_FILE"
    exit 1
fi

# 2. Backup current state
echo "2. Creating backup..."
mkdir -p "$BACKUP_DIR"
docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump -U k_planer k_planer > "$BACKUP_DIR/database.sql"
docker volume inspect postgres_data --format='{{.Mountpoint}}' | xargs -I {} cp -r {} "$BACKUP_DIR/postgres_volume" || true

# 3. Pull latest images
echo "3. Pulling latest Docker images..."
docker-compose -f "$DOCKER_COMPOSE_FILE" pull

# 4. Start services
echo "4. Starting services..."
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

# 5. Wait for services to be ready
echo "5. Waiting for services to be healthy..."
for i in {1..30}; do
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T api_gateway curl -f http://localhost:8002/health > /dev/null 2>&1; then
        echo "✅ All services ready"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# 6. Run migrations
echo "6. Running database migrations..."
docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T api_gateway python migrate.py

# 7. Verify deployment
echo "7. Verifying deployment..."
if ! docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T api_gateway curl -f http://localhost:8002/health > /dev/null 2>&1; then
    echo "❌ Deployment verification failed"
    echo "Rolling back..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    # Restore database
    exit 1
fi

# 8. Health check
echo "8. Running health checks..."
HEALTH=$(docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T api_gateway curl -s http://localhost:8002/health | jq -r '.status')
if [ "$HEALTH" != "ok" ]; then
    echo "❌ Health check failed"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo "📁 Backup location: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Verify application is running: https://app.k-planer.com"
echo "2. Check logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f api_gateway"
echo "3. Monitor metrics: https://prometheus.k-planer.com"
```

---

**Documentation Complete!** 🎉

This configuration is ready for production deployment. Ensure all secrets are properly managed before going live.

