from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing 
from ..core.database import get_db
from ..core.security import get_password_hash, get_current_admin, get_current_super_admin

from ..models import Utilisateur
from ..schemas import UtilisateurCreate, UtilisateurOut, Token, UtilisateurUpdate, UserRolesUpdate
from ..crud.utilisateur import get_utilisateur_by_id, update_utilisateur



router = APIRouter(prefix="/admin", tags=["Administrateur"])


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
    _ensure_unique_user_identity_fields(
        db,
        email=update_data.get("email"),
        username=update_data.get("username"),
        current_user_id=user_id,
    )
    _validate_admin_password_update(update_data)

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
    roles: UserRolesUpdate,
    db: Session = Depends(get_db),
    current_super_admin: UtilisateurOut = Depends(get_current_super_admin)
):
    db_user = get_utilisateur_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    update_data = roles.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucun champ de rôle fourni")
    
    updated_user = update_utilisateur(db, user_id, update_data)
    return updated_user
