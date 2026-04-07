from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from ..core.database import get_db
from ..core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    logout_user,
    oauth2_scheme,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_admin,
    get_current_super_admin
)
from ..models import Utilisateur
from ..schemas import UtilisateurCreate, UtilisateurOut, Token, UtilisateurUpdate, UserRolesUpdate
from ..crud.utilisateur import (
    get_utilisateur_by_email_or_username,
    create_utilisateur,
    get_utilisateur_by_id,
    update_utilisateur,
    get_utilisateur_by_email,
    get_utilisateur_by_username
)

router = APIRouter(prefix="/auth", tags=["Authentification"])


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


@router.post("/register", response_model=UtilisateurOut, status_code=status.HTTP_201_CREATED)
def register(user: UtilisateurCreate, db: Session = Depends(get_db)):
    _ensure_unique_user_identity_fields(db, email=user.email, username=user.username)
    
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
    _ensure_unique_user_identity_fields(
        db,
        email=update_data.get("email"),
        username=update_data.get("username"),
        current_user_id=current_user.id,
    )
    _validate_self_password_update(update_data)

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

