from fastapi import HTTPException
from starlette import status
from sqlalchemy.orm import Session
import secrets
import base64
import hashlib
import hmac
import json
import string
import struct
import time
from datetime import datetime, timedelta
from typing import Any, Type, TypeVar
from urllib.parse import quote
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import Utilisateur

ModelType = TypeVar("ModelType")


def generate_unique_id(db: Session, model: Type[ModelType]) -> str:
    """
    Genere un ID hexadecimal unique de 12 caracteres pour un modele donne.
    Verifie l'unicite dans la table cible avant de le retourner.
    """
    while True:
        new_id = secrets.token_hex(6)
        result = db.execute(select(model).where(model.id == new_id))
        existing_obj = result.scalars().first()
        if not existing_obj:
            return new_id


def generate_unique_user_id(db: Session) -> str:
    """
    Conserve l'API demandee pour la table utilisateur.
    """
    return generate_unique_id(db, Utilisateur)


def generate_email_verification_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def get_email_verification_expiration(hours: int = 24) -> datetime:
    return datetime.utcnow() + timedelta(hours=hours)


def generate_google_authenticator_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("utf-8").rstrip("=")


def _parse_auth_security_state(raw_state: str | None) -> dict[str, str]:
    if not raw_state:
        return {}

    try:
        parsed = json.loads(raw_state)
    except (TypeError, json.JSONDecodeError):
        return {}

    if isinstance(parsed, dict):
        return {str(key): str(value) for key, value in parsed.items() if value}
    return {}


def build_auth_security_state(
    existing_state: str | None = None,
    *,
    email_verification_code: str | None = None,
    google_auth_secret: str | None = None,
    clear_email_verification_code: bool = False,
) -> str | None:
    state = _parse_auth_security_state(existing_state)

    if clear_email_verification_code:
        state.pop("email_verification_code", None)
    elif email_verification_code is not None:
        state["email_verification_code"] = email_verification_code

    if google_auth_secret is not None:
        state["google_auth_secret"] = google_auth_secret
    elif "google_auth_secret" not in state:
        state["google_auth_secret"] = generate_google_authenticator_secret()

    return json.dumps(state) if state else None


def get_email_verification_code_from_state(state: str | None) -> str | None:
    return _parse_auth_security_state(state).get("email_verification_code")


def get_google_auth_secret_from_state(state: str | None) -> str | None:
    return _parse_auth_security_state(state).get("google_auth_secret")


def build_email_verification_metadata(
    existing_state: str | None = None,
    hours: int = 24,
) -> dict[str, Any]:
    return {
        "is_utilisateur_verifie": False,
        "email_verified_at": None,
        "token_confirmation_email": build_auth_security_state(
            existing_state,
            email_verification_code=generate_email_verification_code(),
        ),
        "date_exp_token_confirmation_email": get_email_verification_expiration(hours=hours),
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


def _ensure_unique_user_identity_fields(
    db: Session,
    email: str | None = None,
    username: str | None = None,
    current_user_id: str | None = None,
) -> None:
    if email:
        existing_email = get_utilisateur_by_email(db, email)
        if existing_email and existing_email.id != current_user_id:
            raise HTTPException(
                status_code=400,
                detail={"field": "email", "message": "Cette adresse email est déjà utilisée"},
            )

    if username:
        existing_username = get_utilisateur_by_username(db, username)
        if existing_username and existing_username.id != current_user_id:
            raise HTTPException(
                status_code=400,
                detail={"field": "username", "message": "Ce nom d'utilisateur est déjà utilisé"},
            )


def _validate_self_password_update(update_data: dict) -> None:
    has_current_password = "current_password" in update_data
    has_new_password = "new_password" in update_data

    if has_current_password != has_new_password:
        raise HTTPException(
            status_code=400,
            detail="Pour modifier votre mot de passe, fournissez current_password et new_password ensemble.",
        )


def _validate_admin_password_update(update_data: dict) -> None:
    if "current_password" in update_data and "new_password" not in update_data:
        raise HTTPException(
            status_code=400,
            detail="Pour modifier le mot de passe d'un utilisateur, fournissez new_password.",
        )


def _email_has_changed(db_user: Utilisateur, update_data: dict) -> bool:
    return "email" in update_data and update_data["email"] != db_user.email


def _get_or_create_google_auth_secret(user: Utilisateur) -> tuple[str, bool]:
    google_auth_secret = get_google_auth_secret_from_state(user.token_confirmation_email)
    if google_auth_secret:
        return google_auth_secret, False

    user.token_confirmation_email = build_auth_security_state(user.token_confirmation_email)
    google_auth_secret = get_google_auth_secret_from_state(user.token_confirmation_email)
    return google_auth_secret, True

