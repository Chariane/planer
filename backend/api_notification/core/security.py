import os
from datetime import datetime
from typing import Optional

from dotenv import dotenv_values
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..models import Utilisateur
from ..schemas import UtilisateurOut
from .database import get_db

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
config_data = {**dotenv_values(os.path.join(BASE_DIR, ".env")), **os.environ}
SECRET_KEY = config_data.get("SECRET_KEY") or os.getenv("SECRET_KEY")
ALGORITHM = config_data.get("ALGORITHM") or os.getenv("ALGORITHM", "HS256")

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
    except JWTError:
        raise credentials_exception

    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    return UtilisateurOut.model_validate(user)


async def get_current_active_user(current_user: UtilisateurOut = Depends(get_current_user)) -> UtilisateurOut:
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Utilisateur inactif.")
    return current_user
