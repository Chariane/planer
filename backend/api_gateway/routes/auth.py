from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from ..database import get_db
from ..models import Utilisateur
from ..schemas import UtilisateurCreate, UtilisateurOut, Token, UtilisateurUpdate
from ..security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    logout_user,
    oauth2_scheme,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from ..crud.utilisateur_crud import (
    get_utilisateur_by_email_or_username,
    create_utilisateur,
    get_utilisateur_by_id,
    update_utilisateur
)

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", response_model=UtilisateurOut, status_code=status.HTTP_201_CREATED)
def register(user: UtilisateurCreate, db: Session = Depends(get_db)):
    print("DONNÉES REÇUES :", user.model_dump())

    # Vérifier si l'utilisateur existe déjà
    existing = get_utilisateur_by_email_or_username(db, user.email, user.username)
    if existing:
        raise HTTPException(status_code=400, detail="Email ou nom d'utilisateur déjà utilisé")

    # Préparer les données
    user_data = user.model_dump()
    password = user_data.pop("password")
    user_data["mot_de_passe"] = get_password_hash(password)

    # Créer l'utilisateur
    new_user = create_utilisateur(db, user_data)
    return new_user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Rechercher l'utilisateur par email ou username
    user = get_utilisateur_by_email_or_username(db, form_data.username, form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.mot_de_passe or not verify_password(form_data.password, user.mot_de_passe):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Utilisateur inactif")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UtilisateurOut)
def get_me(current_user: UtilisateurOut = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UtilisateurOut)
def update_me(
    user_update: UtilisateurUpdate,
    current_user: UtilisateurOut = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_user = get_utilisateur_by_id(db, current_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    update_data = user_update.model_dump(exclude_unset=True)

    # Gestion du changement de mot de passe
    if "current_password" in update_data and "new_password" in update_data:
        if not verify_password(update_data["current_password"], db_user.mot_de_passe):
            raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
        db_user.mot_de_passe = get_password_hash(update_data["new_password"])
        del update_data["current_password"]
        del update_data["new_password"]

    # Mise à jour des autres champs
    updated_user = update_utilisateur(db, current_user.id, update_data)
    return updated_user


@router.post("/logout")
def logout(current_user: UtilisateurOut = Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    logout_user(token)
    return {"message": "Déconnexion réussie"}