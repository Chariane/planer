from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from ..database import get_db
from ..models import Utilisateur
from ..schemas import UtilisateurCreate, UtilisateurOut, Token, UtilisateurUpdate, UserRolesUpdate
from ..security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    logout_user,
    oauth2_scheme,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_admin
)
from ..crud.utilisateur import (
    get_utilisateur_by_email_or_username,
    create_utilisateur,
    get_utilisateur_by_id,
    update_utilisateur,
    get_utilisateur_by_email,
    get_utilisateur_by_username
)

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", response_model=UtilisateurOut, status_code=status.HTTP_201_CREATED)
def register(user: UtilisateurCreate, db: Session = Depends(get_db)):
    print("DONNÉES REÇUES :", user.model_dump())

    # Vérifier si l'utilisateur existe déjà
    existing_email = get_utilisateur_by_email(db, user.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Cette adresse email est déjà utilisée")    
    existing_username = get_utilisateur_by_username(db, user.username)
    if existing_username:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé")
    
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

# ----------------------------------------
# ROUTES ADMINISTRATEUR
# ----------------------------------------

@router.get("/users", response_model=List[UtilisateurOut])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    users = db.query(Utilisateur).offset(skip).limit(limit).all()
    return users

@router.get("/users/{user_id}", response_model=UtilisateurOut)
def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    user = get_utilisateur_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user

@router.put("/users/{user_id}", response_model=UtilisateurOut)
def update_user_by_admin(
    user_id: str,
    user_update: UtilisateurUpdate,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    update_data = user_update.model_dump(exclude_unset=True)

    # Gestion du changement de mot de passe par admin (sans vérifier l'ancien)
    if "new_password" in update_data:
        db_user.mot_de_passe = get_password_hash(update_data["new_password"])
        del update_data["new_password"]
    if "current_password" in update_data:
        del update_data["current_password"]  # Ignorer pour admin

    # Mise à jour des autres champs
    updated_user = update_utilisateur(db, user_id, update_data)
    return updated_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Soft delete : changer le statut à "Supprimé"
    update_utilisateur(db, user_id, {"statut": "Supprimé"})
    return None

@router.post("/users/{user_id}/activate", response_model=UtilisateurOut)
def activate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    updated_user = update_utilisateur(db, user_id, {"is_active": True, "statut": "Actif"})
    return updated_user

@router.post("/users/{user_id}/deactivate", response_model=UtilisateurOut)
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    updated_user = update_utilisateur(db, user_id, {"is_active": False, "statut": "Suspendu"})
    return updated_user

@router.put("/users/{user_id}/roles", response_model=UtilisateurOut)
def update_user_roles(
    user_id: str,
    roles: dict,  # Ex: {"is_admin": True, "is_super_admin": False, "is_livreur": True}
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier que seuls les champs de rôle sont mis à jour
    allowed_fields = {"is_admin", "is_super_admin", "is_livreur", "is_entreprise", "is_user"}
    update_data = {k: v for k, v in roles.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucun champ de rôle valide fourni")
    
    updated_user = update_utilisateur(db, user_id, update_data)
    return updated_user