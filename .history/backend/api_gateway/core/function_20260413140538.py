import base64
import hashlib
import hmac
import string
import struct
import time
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from dotenv import dotenv_values
from urllib.parse import quote
from ..models import Utilisateur

lodotenv = dotenv_values(".env")

def ensure_unique_user_identity_fields(
    db: Session,
    email: str | None = None,
    username: str | None = None,
    current_user_id: str | None = None,
) -> None:
    if email:
        existing_email = db.query(Utilisateur).filter(Utilisateur.email == email).first()
        if existing_email and existing_email.id != current_user_id:
            raise HTTPException(
                status_code=400,
                detail={"field": "email", "message": "Cette adresse email est déjà utilisée"},
            )

    if username:
        existing_username = db.query(Utilisateur).filter(Utilisateur.username == username).first()
        if existing_username and existing_username.id != current_user_id:
            raise HTTPException(
                status_code=400,
                detail={"field": "username", "message": "Ce nom d'utilisateur est déjà utilisé"},
            )


def validate_self_password_update(update_data: dict) -> None:
    has_current_password = "current_password" in update_data
    has_new_password = "new_password" in update_data

    if has_current_password != has_new_password:
        raise HTTPException(
            status_code=400,
            detail="Pour modifier votre mot de passe, fournissez current_password et new_password ensemble.",
        )


def validate_new_password_is_different(current_password: str, new_password: str) -> None:
    if current_password == new_password:
        raise HTTPException(
            status_code=400,
            detail="Le nouveau mot de passe doit etre different de l'ancien.",
        )


def validate_admin_password_update(update_data: dict) -> None:
    if "current_password" in update_data and "new_password" not in update_data:
        raise HTTPException(
            status_code=400,
            detail="Pour modifier le mot de passe d'un utilisateur, fournissez new_password.",
        )


def email_has_changed(db_user: Utilisateur, update_data: dict) -> bool:
    return "email" in update_data and update_data["email"] != db_user.email


def build_email_not_verified_detail(email: str) -> dict[str, Any]:
    return {
        "code": "email_not_verified",
        "message": "Votre adresse email n'est pas encore verifiee.",
        "next_action": {
            "method": "POST",
            "endpoint": "/auth/resend-verification-code",
            "payload": {"email": email},
        },
    }


def generate_email_verification_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def get_current_utc_datetime() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def is_expired_datetime(value: datetime | None, reference: datetime | None = None) -> bool:
    if value is None:
        return False

    reference_datetime = ensure_utc_datetime(reference or get_current_utc_datetime())
    return ensure_utc_datetime(value) < reference_datetime


def get_email_verification_expiration(hours: int = 24) -> datetime:
    return get_current_utc_datetime() + timedelta(hours=hours)


def build_password_reset_metadata(hours: int = 1) -> dict[str, Any]:
    return {
        "token_reinitialisation_mdp": generate_email_verification_code(),
        "date_exp_token_reinitialisation": get_current_utc_datetime() + timedelta(hours=hours),
    }


def generate_google_authenticator_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("utf-8").rstrip("=")


def get_or_create_google_auth_secret(user: Utilisateur) -> tuple[str, bool]:
    if user.google_auth_secret:
        return user.google_auth_secret, False

    user.google_auth_secret = generate_google_authenticator_secret()
    return user.google_auth_secret, True


def is_google_authenticator_setup_required(user: Utilisateur) -> bool:
    return not bool(user.is_2fa_enabled)


def enable_google_authenticator(user: Utilisateur) -> None:
    if not user.is_2fa_enabled:
        user.is_2fa_enabled = True
        user.google_auth_configured_at = get_current_utc_datetime()


def disable_google_authenticator(user: Utilisateur) -> None:
    user.is_2fa_enabled = False
    user.google_auth_secret = None
    user.google_auth_configured_at = None


def build_google_authenticator_setup_payload(
    user: Utilisateur,
    message: str,
) -> dict[str, Any]:
    setup_required = is_google_authenticator_setup_required(user)
    payload: dict[str, Any] = {
        "message": message,
        "setup_required": setup_required,
        "is_2fa_enabled": bool(user.is_2fa_enabled),
        "google_auth_configured_at": user.google_auth_configured_at,
    }
    if setup_required and user.google_auth_secret:
        payload["google_authenticator_secret"] = user.google_auth_secret
        payload["google_authenticator_otpauth_url"] = build_google_authenticator_otpauth_url(
            user.google_auth_secret,
            user.email,
        )
    return payload


def build_email_verification_metadata(
    hours: int = 24,
) -> dict[str, Any]:
    return {
        "is_utilisateur_verifie": False,
        "email_verified_at": None,
        "code_verification_email": generate_email_verification_code(),
        "date_exp_code_verification_email": get_email_verification_expiration(hours=hours),
    }


def build_google_authenticator_otpauth_url(
    secret: str,
    account_name: str,
    issuer: str = "K-Planer",
) -> str:
    encoded_issuer = quote(issuer)
    encoded_account = quote(account_name)
    return (
        f"otpauth://totp/{encoded_issuer}:{encoded_account}"
        f"?secret={secret}&issuer={encoded_issuer}&algorithm=SHA1&digits=6&period=30"
    )


def _normalize_base32_secret(secret: str) -> str:
    padding = (-len(secret)) % 8
    return secret + ("=" * padding)


def generate_totp_code(secret: str, timestamp: int | None = None, period: int = 30, digits: int = 6) -> str:
    if timestamp is None:
        timestamp = int(time.time())

    counter = int(timestamp // period)
    key = base64.b32decode(_normalize_base32_secret(secret), casefold=True)
    counter_bytes = struct.pack(">Q", counter)
    digest = hmac.new(key, counter_bytes, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    otp = binary % (10 ** digits)
    return str(otp).zfill(digits)


def verify_google_authenticator_code(secret: str, code: str, window: int = 1) -> bool:
    sanitized_code = "".join(char for char in str(code) if char.isdigit())
    if len(sanitized_code) != 6:
        return False

    now = int(time.time())
    for step in range(-window, window + 1):
        comparison_time = now + (step * 30)
        if generate_totp_code(secret, timestamp=comparison_time) == sanitized_code:
            return True
    return False


def commit_or_raise(
    db: Session,
    *,
    detail: str,
    status_code: int = 409,
    refresh_instance: Any | None = None,
) -> None:
    try:
        db.commit()
        if refresh_instance is not None:
            db.refresh(refresh_instance)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status_code, detail=detail) from exc

def decode_token(token: str, expected_purpose: Optional[str] = None) -> dict:
    secret_key = _require_secret_key()

    payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
    token_purpose = payload.get("purpose", "access")
    if expected_purpose and token_purpose != expected_purpose:
        raise JWTError(f"Jeton invalide pour l'usage attendu: {expected_purpose}")
    return payload