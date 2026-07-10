import logging
import os
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from dotenv import dotenv_values
from typing import Optional

from ..models import Utilisateur
from ..schemas import UtilisateurOut
from .database import get_db

# -----------------------------
# Configuration
# -----------------------------
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
config_data = dotenv_values(os.path.join(BASE_DIR, ".env"))
SECRET_KEY = config_data.get("SECRET_KEY")
ALGORITHM = config_data.get("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(config_data.get("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -----------------------------
# Blacklist des tokens
# -----------------------------
token_blacklist = set()

def add_to_blacklist(token: str):
    """Ajoute un token à la blacklist"""
    token_blacklist.add(token)
    logger.info(f"Token ajouté à la blacklist")

def is_token_blacklisted(token: str) -> bool:
    """Vérifie si un token est blacklisté"""
    return token in token_blacklist

def cleanup_expired_tokens():
    """Nettoie périodiquement la blacklist (optionnel)"""
    pass

# ----------------------------

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_invitation_token(token: str) -> Optional[dict]:
    """Décode et valide un token d'invitation (workspace ou espace)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # On vérifie que c'est bien une invitation
        if payload.get("type") in ["workspace_invitation", "espace_invitation"]:
            return payload
        if payload.get("scope") in ["workspace_invitation_accept", "espace_invitation_accept"]:
            return payload
        return None
    except JWTError:
        return None


async def get_current_user(request: Request, db: Session = Depends(get_db)) -> UtilisateurOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les informations d'identification",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            raise credentials_exception

    if is_token_blacklisted(token):
        logger.warning(f"Tentative d'utilisation d'un token blacklisté")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expirée. Veuillez vous reconnecter.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        exp = payload.get("exp")
        if exp and datetime.utcnow() > datetime.fromtimestamp(exp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expiré",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except JWTError as e:
        logger.error(f"Erreur JWT: {e}")
        raise credentials_exception

    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    return UtilisateurOut.from_orm(user)


async def get_current_active_user(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilisateur inactif. Veuillez contacter un administrateur."
        )
    return current_user


async def get_current_admin(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération non autorisée. Nécessite les privilèges d'administrateur."
        )
    return current_user


async def get_current_livreur(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_livreur:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération non autorisée. Nécessite les privilèges de livreur."
        )
    return current_user


async def get_current_active_livreur(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilisateur inactif. Veuillez contacter un administrateur."
        )
    if not current_user.is_livreur:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération non autorisée. Nécessite les privilèges de livreur."
        )
    return current_user


async def get_current_entreprise(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_entreprise:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération non autorisée. Nécessite le statut de gérant d'entreprise."
        )
    return current_user


async def get_current_active_entreprise(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utilisateur inactif. Veuillez contacter un administrateur."
        )
    if not current_user.is_entreprise:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération non autorisée. Nécessite le statut de gérant d'entreprise."
        )
    return current_user


async def logout_user(token: str):
    """Déconnecte un utilisateur en blacklistant son token"""
    add_to_blacklist(token)
    logger.info(f"Utilisateur déconnecté - token blacklisté")

def get_access_token_from_request(request: Request) -> Optional[str]:
    """
    Extrait le token JWT du cookie 'access_token' dans la requête.
    Utilisé comme dépendance FastAPI pour injecter le token dans les routes.
    """
    token = request.cookies.get("access_token")
    return token