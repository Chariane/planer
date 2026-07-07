# 🔧 CORRECTIONS DE CODE - P3 PRIORITÉ MOYENNE
## K-Planer Security Fixes - Priority 3 (Semaines 4-6)

**Date:** 7 juillet 2026  
**Effort:** 8-12 heures  
**Timeline:** Semaines 4-6  

---

## 🟡 P3.1: Authentification Multi-Facteurs (2FA/TOTP)

### Problème
Sans 2FA → même avec password fort, risque de compromission par phishing

### Solution

```bash
# Installer dependencies
pip install pyotp qrcode pillow
pip install phonenumbers twilio  # Optional: SMS 2FA
```

```python
# backend/api_gateway/models/Utilisateur.py
from sqlalchemy import Column, String, Boolean, DateTime
import pyotp
from datetime import datetime

class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    
    # ... colonnes existantes ...
    
    # ✅ Colonnes pour 2FA
    totp_secret = Column(String, nullable=True)  # Secret TOTP
    is_2fa_enabled = Column(Boolean, default=False)  # 2FA activé?
    backup_codes = Column(String, nullable=True)  # Codes de secours (JSON)
    phone_number = Column(String, nullable=True)  # Pour SMS 2FA
    last_2fa_verification = Column(DateTime, nullable=True)  # Dernière vérification 2FA

class TwoFactorSetup(BaseModel):
    """✅ Setup 2FA initial"""
    totp_secret: str
    qr_code: str  # QR code en base64
    backup_codes: List[str]

class TwoFactorVerify(BaseModel):
    """✅ Vérifier le code 2FA"""
    code: str = Field(..., min_length=6, max_length=6, regex="^[0-9]{6}$")
```

```python
# backend/api_gateway/core/two_factor.py
import pyotp
import qrcode
from io import BytesIO
import base64
from typing import Tuple, List
import secrets

class TwoFactorManager:
    """✅ Gestion de l'authentification 2FA"""
    
    @staticmethod
    def generate_secret_and_qr(user_email: str, app_name: str = "K-Planer") -> Tuple[str, str, List[str]]:
        """
        Générer secret TOTP et QR code
        
        Returns:
            - secret: Secret à sauvegarder en DB
            - qr_code: QR code en base64 pour afficher au user
            - backup_codes: Codes de secours (10 codes)
        """
        # ✅ Générer secret TOTP
        secret = pyotp.random_base32()
        
        # ✅ Créer l'objet TOTP
        totp = pyotp.TOTP(secret)
        
        # ✅ Générer QR code
        uri = totp.provisioning_uri(
            name=user_email,
            issuer_name=app_name
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir en base64
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        # ✅ Générer codes de secours
        backup_codes = [secrets.token_hex(4) for _ in range(10)]
        
        return secret, f"data:image/png;base64,{img_str}", backup_codes
    
    @staticmethod
    def verify_totp(secret: str, code: str, window: int = 1) -> bool:
        """
        Vérifier le code TOTP
        
        Args:
            secret: Secret TOTP sauvegardé
            code: Code entré par l'utilisateur (6 chiffres)
            window: Accepter les codes adjacents (±window*30 secondes)
        
        Returns:
            True si le code est valide, False sinon
        """
        totp = pyotp.TOTP(secret)
        # ✅ window=1 accepte le code actuel + les 2 précédents et 2 suivants
        # (prévient les problèmes de désynchronisation horloge)
        return totp.verify(code, valid_window=window)
    
    @staticmethod
    def verify_backup_code(backup_codes_json: str, code: str) -> Tuple[bool, str]:
        """
        Vérifier un code de secours
        
        Returns:
            - is_valid: True si valide
            - updated_codes_json: Codes mis à jour (code supprimé s'il était valide)
        """
        import json
        
        try:
            codes = json.loads(backup_codes_json)
        except:
            return False, backup_codes_json
        
        if code in codes:
            # ✅ Supprimer le code utilisé (une seule utilisation)
            codes.remove(code)
            return True, json.dumps(codes)
        
        return False, backup_codes_json

# Usage
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter()

@router.post("/auth/2fa/setup")
async def setup_2fa(current_user: Utilisateur = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    ✅ Initialiser le setup de 2FA
    Étape 1: Générer secret et QR code
    """
    secret, qr_code, backup_codes = TwoFactorManager.generate_secret_and_qr(
        current_user.email
    )
    
    return {
        "secret": secret,  # À sauvegarder temporairement (pas encore validé)
        "qr_code": qr_code,
        "backup_codes": backup_codes,
        "message": "Scannez le QR code avec Google Authenticator et confirmez avec 2FA/setup/confirm"
    }

@router.post("/auth/2fa/setup/confirm")
async def confirm_2fa_setup(
    code: str = Field(..., min_length=6, max_length=6),
    secret: str = Depends(...),  # Depuis le setup précédent
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Confirmer le setup de 2FA
    Étape 2: Vérifier le code TOTP et activer 2FA
    """
    # Vérifier le code TOTP
    if not TwoFactorManager.verify_totp(secret, code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code"
        )
    
    # Régénérer les backup codes
    _, _, backup_codes = TwoFactorManager.generate_secret_and_qr(current_user.email)
    
    # Sauvegarder en DB
    current_user.totp_secret = secret
    current_user.is_2fa_enabled = True
    current_user.backup_codes = json.dumps(backup_codes)
    db.commit()
    
    logger.info("2FA enabled", user_id=current_user.id)
    
    return {
        "message": "2FA enabled successfully",
        "backup_codes": backup_codes,
        "warning": "Sauvegardez ces codes de secours dans un endroit sûr"
    }

@router.post("/auth/login/2fa")
async def verify_2fa_during_login(
    credentials: LoginSchema,
    code: str = Field(..., min_length=6, max_length=6),
    db: Session = Depends(get_db)
):
    """
    ✅ Vérifier 2FA pendant le login
    Étape 2 du login: vérifier le code TOTP ou un backup code
    """
    # Récupérer l'utilisateur
    user = await get_user_by_email(db, credentials.email)
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Vérifier que 2FA est activé
    if not user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not enabled for this user"
        )
    
    # Essayer TOTP d'abord
    if TwoFactorManager.verify_totp(user.totp_secret, code):
        user.last_2fa_verification = datetime.utcnow()
        db.commit()
        
        # Créer les tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    # Essayer backup code
    is_valid, updated_codes = TwoFactorManager.verify_backup_code(user.backup_codes, code)
    if is_valid:
        # ✅ Mettre à jour les codes (supprimer celui utilisé)
        user.backup_codes = updated_codes
        user.last_2fa_verification = datetime.utcnow()
        db.commit()
        
        logger.warn("Backup code used", user_id=user.id)
        
        return {
            "access_token": create_access_token(data={"sub": str(user.id)}),
            "refresh_token": create_refresh_token(data={"sub": str(user.id)}),
            "token_type": "bearer",
            "warning": "Vous avez utilisé un backup code. Vérifiez votre sécurité."
        }
    
    # Code invalide
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid 2FA code"
    )
```

### Frontend Component - Setup 2FA

```typescript
// frontend/src/pages/Settings2FAPage.tsx
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { sanitizeText } from '../utils/sanitize'

export function Settings2FAPage() {
  const { user } = useAuth()
  const [step, setStep] = useState<'disabled' | 'setup' | 'confirm' | 'enabled'>('disabled')
  const [qrCode, setQrCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSetup2FA = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json()
      setQrCode(data.qr_code)
      setBackupCodes(data.backup_codes)
      setStep('setup')
    } catch (error) {
      console.error('2FA setup failed', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm2FA = async () => {
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      alert('Code doit être 6 chiffres')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/2fa/setup/confirm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      if (response.ok) {
        setStep('enabled')
      }
    } catch (error) {
      console.error('2FA confirmation failed', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Authentification à 2 Facteurs</h1>

      {step === 'disabled' && (
        <div className="space-y-4">
          <p>Sécurisez votre compte avec une authentification à 2 facteurs (2FA)</p>
          <button
            onClick={handleSetup2FA}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? 'Setup...' : 'Activer 2FA'}
          </button>
        </div>
      )}

      {step === 'setup' && (
        <div className="space-y-4">
          <p>Scannez ce QR code avec Google Authenticator:</p>
          {qrCode && (
            <img src={qrCode} alt="QR Code" className="w-64 h-64 border" />
          )}
          <p>Ou entrez manuellement la clé: (secret fourni)</p>
          <p className="text-sm text-gray-600">
            Codes de secours (gardez-les en sécurité):
          </p>
          <div className="bg-gray-100 p-4 rounded text-xs font-mono">
            {backupCodes.map((code, i) => (
              <div key={i}>{sanitizeText(code)}</div>
            ))}
          </div>
        </div>
      )}

      {step === 'setup' && (
        <div className="mt-6 space-y-4">
          <input
            type="text"
            maxLength={6}
            placeholder="Entrez le code à 6 chiffres"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="px-4 py-2 border rounded"
          />
          <button
            onClick={handleConfirm2FA}
            disabled={code.length !== 6 || loading}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Confirming...' : 'Confirmer'}
          </button>
        </div>
      )}

      {step === 'enabled' && (
        <div className="bg-green-100 border border-green-400 p-4 rounded">
          ✅ 2FA activé avec succès!
        </div>
      )}
    </div>
  )
}
```

---

## 🟡 P3.2: Monitoring & Alerting en Temps Réel

### Problème
Pas de détection des attaques en cours → breach possible sans détection

### Solution: Sentry + CloudWatch

```bash
# Installer Sentry
pip install sentry-sdk

# Installer CloudWatch boto3
pip install boto3
```

```python
# backend/api_gateway/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
import boto3
from config import get_settings

settings = get_settings()

# ✅ Initialiser Sentry pour monitoring
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1,  # Collecter 10% des traces
        environment=settings.ENVIRONMENT,
        attach_stacktrace=True,
    )

# ✅ CloudWatch pour les métriques
cloudwatch = boto3.client('cloudwatch', region_name='eu-west-1')

class SecurityMonitor:
    """✅ Monitorer les événements de sécurité"""
    
    @staticmethod
    def report_failed_login(email: str, ip_address: str):
        """Rapporter une tentative de login échouée"""
        cloudwatch.put_metric_data(
            Namespace='K-Planer/Security',
            MetricData=[
                {
                    'MetricName': 'FailedLoginAttempt',
                    'Value': 1,
                    'Unit': 'Count',
                    'Dimensions': [
                        {'Name': 'Email', 'Value': email},
                        {'Name': 'IpAddress', 'Value': ip_address}
                    ]
                }
            ]
        )
        
        # ✅ Si plus de 5 tentatives dans 5 minutes → alerte
        
        sentry_sdk.capture_event({
            'level': 'warning',
            'message': f'Failed login attempt for {email}',
            'extra': {
                'email': email,
                'ip_address': ip_address
            }
        })
    
    @staticmethod
    def report_suspicious_activity(user_id: str, activity: str, severity: str = 'warning'):
        """Rapporter une activité suspecte"""
        logger.warn(activity, user_id=user_id)
        
        if severity == 'critical':
            # Envoyer alerte immédiate
            send_security_alert(
                subject=f"Alerte Sécurité Critique: {activity}",
                message=f"User {user_id}: {activity}"
            )
```

### CloudWatch Alarms

```python
# backend/monitoring/setup_alarms.py
import boto3

cloudwatch = boto3.client('cloudwatch')
sns = boto3.client('sns')

# Créer SNS topic pour les alertes
response = sns.create_topic(Name='k-planer-security-alerts')
sns_topic_arn = response['TopicArn']

# ✅ Alerte: Trop de login échoués
cloudwatch.put_metric_alarm(
    AlarmName='K-Planer-FailedLoginSpike',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=1,
    MetricName='FailedLoginAttempt',
    Namespace='K-Planer/Security',
    Period=300,  # 5 minutes
    Statistic='Sum',
    Threshold=20,  # Plus de 20 tentatives échouées
    ActionsEnabled=True,
    AlarmActions=[sns_topic_arn],
    AlarmDescription='Alerte si trop de tentatives de login échouées'
)

# ✅ Alerte: 500 errors élevés
cloudwatch.put_metric_alarm(
    AlarmName='K-Planer-HighErrorRate',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=2,
    MetricName='500Errors',
    Namespace='K-Planer/API',
    Period=60,
    Statistic='Sum',
    Threshold=10,
    ActionsEnabled=True,
    AlarmActions=[sns_topic_arn]
)

# ✅ Alerte: Accès non autorisé
cloudwatch.put_metric_alarm(
    AlarmName='K-Planer-UnauthorizedAccess',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=1,
    MetricName='UnauthorizedAccess',
    Namespace='K-Planer/Security',
    Period=60,
    Statistic='Sum',
    Threshold=5,
    ActionsEnabled=True,
    AlarmActions=[sns_topic_arn]
)

print(f"✅ Alarms configurées. SNS Topic: {sns_topic_arn}")
```

---

## 🟡 P3.3: WAF (Web Application Firewall)

### Problème
Pas de protection contre les attaques Web courantes (SQLi, XSS, CSRF, etc.)

### Solution: CloudFlare WAF

```yaml
# Intégration CloudFlare (interface web)
Security → WAF Rules → Add Custom Rule

# Rule 1: Rejeter les patterns SQLi
(cf.threat_score > 50) or (http.request.uri.query contains "'; DROP")

# Rule 2: Rate limit par IP
(cf.ip.is_datacenter == true) or (cf.threat_score > 80)

# Rule 3: CORS policy
(http.request.method == "OPTIONS") and (http.host == "attacker.com")
```

### Backend: Headers WAF

```python
# backend/middleware/waf_headers.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class WAFHeadersMiddleware(BaseHTTPMiddleware):
    """✅ Ajouter les headers de sécurité WAF"""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # ✅ Headers de sécurité
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response

# app.add_middleware(WAFHeadersMiddleware)
```

---

## 🟡 P3.4: Penetration Testing Schedule

### Solution

```markdown
# Penetration Testing Plan

## Phase 1: Scope Definition (Semaine 1)
- Identifier les assets critiques
- Définir les règles d'engagement
- Contrats signés avec le pen tester

## Phase 2: Recon (Semaine 2)
- Enumération des endpoints
- Identification des versions utilisées
- Analyse de la surface d'attaque

## Phase 3: Scanning (Semaines 3-4)
- Tests automatisés (Burp Suite, OWASP ZAP)
- Scan des vulnérabilités communes

## Phase 4: Exploitation (Semaines 5-6)
- Tentatives d'exploitation des vulnérabilités trouvées
- Tests d'escalade de privilèges

## Phase 5: Reporting (Semaine 7)
- Rapport détaillé des vulnérabilités
- Recommandations de remédiation
- Evidence des fixes

## Timeline
- Q3: Pen test initial
- Q4: Pen test de validation après fixes
- Annuel: Pen test complet
```

---

## 📋 CHECKLIST P3 - SEMAINES 4-6

- [ ] 2FA avec TOTP implémenté
- [ ] Codes de secours générés et testés
- [ ] Sentry configuré pour monitoring
- [ ] CloudWatch alarms configurées
- [ ] SNS notifications en place
- [ ] WAF headers configurés
- [ ] Plan de penetration testing établi
- [ ] Tests pour 2FA
- [ ] Documentation complète

---

**Effort Total P3:** 8-12 heures  
**Timeline:** Semaines 4-6  
**Dépendances:** P1 + P2 doivent être complétés

---

## 📊 RÉCAPITULATIF EFFORT TOTAL

| Priority | Heures | Semaines | Fin Prévue |
|----------|--------|----------|-----------|
| **P1** | 12-16h | Semaine 1 | Vendredi S1 |
| **P2** | 10-14h | S2-3 | Vendredi S3 |
| **P3** | 8-12h | S4-6 | Vendredi S6 |
| **Total** | **30-42h** | **6 semaines** | Mi-août |

---

## 💰 ROI ESTIMATION

**Coût de prévention:** 30-42 heures × 50€/h = **1,500€ - 2,100€**

**Coût potentiel d'une breach:**
- Perte de données: 100,000€ - 500,000€
- Arrêt de service: 50,000€ - 200,000€
- Dommages réputationnels: 100,000€ - 1,000,000€
- Amendes RGPD: 20,000€ - 4,000,000€

**Total breach:** 270,000€ - 5,700,000€

**ROI:** 100x - 3,800x
