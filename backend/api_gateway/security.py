import logging
import os
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from .models import Utilisateur
from .schemas import UtilisateurOut
from .database import get_db
from typing import Optional

# -----------------------------
# Chargement des variables d'environnement
# -----------------------------
# Chemin absolu vers le fichier .env (situé dans le même dossier que security.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")
load_dotenv(env_path)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Vérification que les variables essentielles sont bien définies
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY non défini dans le fichier .env")
if not ALGORITHM:
    raise RuntimeError("ALGORITHM non défini dans le fichier .env")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Note : l'URL doit correspondre au endpoint de login défini dans routes/auth.py
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -----------------------------
# Blacklist des tokens (simple en mémoire)
# -----------------------------
token_blacklist = set()

def add_to_blacklist(token: str):
    token_blacklist.add(token)
    logger.info(f"Token ajouté à la blacklist")

def is_token_blacklisted(token: str) -> bool:
    return token in token_blacklist

# -----------------------------
# Fonctions de hash et vérification
# -----------------------------
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# -----------------------------
# Création et validation du token JWT
# -----------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UtilisateurOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les informations d'identification",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if is_token_blacklisted(token):
        logger.warning("Tentative d'utilisation d'un token blacklisté")
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

# -----------------------------
# Dépendances pour les rôles
# -----------------------------
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
            detail="Utilisateur inactif."
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
            detail="Utilisateur inactif."
        )
    if not current_user.is_entreprise:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Opération non autorisée. Nécessite le statut de gérant d'entreprise."
        )
    return current_user

async def logout_user(token: str):
    add_to_blacklist(token)
    logger.info("Utilisateur déconnecté - token blacklisté")