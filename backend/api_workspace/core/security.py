import os
import logging
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from ..models import Utilisateur
from ..schemas import UtilisateurOut
from .database import get_db
from typing import Optional

# Charger le fichier .env explicitement
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Vérification critique
if not SECRET_KEY or not ALGORITHM:
    raise ValueError("SECRET_KEY et ALGORITHM doivent être définis dans le fichier .env")

print(f"[DEBUG] SECRET_KEY chargé: {SECRET_KEY[:10]}...")
print(f"[DEBUG] ALGORITHM chargé: {ALGORITHM}")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

token_blacklist = set()

def add_to_blacklist(token: str):
    token_blacklist.add(token)
    logger.info(f"Token ajouté à la blacklist")

def is_token_blacklisted(token: str) -> bool:
    return token in token_blacklist

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

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UtilisateurOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les informations d'identification",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
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
        raise HTTPException(status_code=403, detail="Utilisateur inactif")
    return current_user

async def get_current_admin(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Privilèges administrateur requis")
    return current_user

async def get_current_livreur(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_livreur:
        raise HTTPException(status_code=403, detail="Privilèges livreur requis")
    return current_user

async def get_current_active_livreur(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Utilisateur inactif")
    if not current_user.is_livreur:
        raise HTTPException(status_code=403, detail="Privilèges livreur requis")
    return current_user

async def get_current_entreprise(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_entreprise:
        raise HTTPException(status_code=403, detail="Statut entreprise requis")
    return current_user

async def get_current_active_entreprise(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Utilisateur inactif")
    if not current_user.is_entreprise:
        raise HTTPException(status_code=403, detail="Statut entreprise requis")
    return current_user

async def logout_user(token: str):
    add_to_blacklist(token)
    logger.info(f"Utilisateur déconnecté - token blacklisté")

def check_workspace_role(db: Session, user_id: str, workspace_id: str, allowed_roles: Optional[list[str]] = None) -> bool:
    from ..models import Membre
    membre = db.query(Membre).filter(
        Membre.id_workspace == workspace_id,
        Membre.id_utilisateur == user_id,
        Membre.statut == "Actif",
    ).first()
    if not membre:
        return False
    if allowed_roles and membre.role not in allowed_roles:
        return False
    return True