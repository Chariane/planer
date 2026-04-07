from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..crud.super_admin import (
    get_all_entreprises,
    get_all_users,
    get_entreprise_by_id,
    get_user_by_id,
    update_entreprise,
    update_user_roles,
)
from ..core.database import get_db
from ..schemas import EntrepriseOut, EntrepriseUpdate, UserRolesUpdate, UtilisateurOut
from ..security import get_current_super_admin

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])


@router.get("/users", response_model=List[UtilisateurOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_super_admin: UtilisateurOut = Depends(get_current_super_admin),
):
    return get_all_users(db, skip=skip, limit=limit)


@router.get("/users/{user_id}", response_model=UtilisateurOut)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_super_admin: UtilisateurOut = Depends(get_current_super_admin),
):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    return user


@router.put("/users/{user_id}/roles", response_model=UtilisateurOut)
def update_user_role_flags(
    user_id: str,
    roles: UserRolesUpdate,
    db: Session = Depends(get_db),
    current_super_admin: UtilisateurOut = Depends(get_current_super_admin),
):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    update_data = roles.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucun champ de role fourni")

    return update_user_roles(db, user, update_data)


@router.get("/entreprises", response_model=List[EntrepriseOut])
def list_entreprises(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_super_admin: UtilisateurOut = Depends(get_current_super_admin),
):
    return get_all_entreprises(db, skip=skip, limit=limit)


@router.get("/entreprises/{entreprise_id}", response_model=EntrepriseOut)
def get_entreprise(
    entreprise_id: str,
    db: Session = Depends(get_db),
    current_super_admin: UtilisateurOut = Depends(get_current_super_admin),
):
    entreprise = get_entreprise_by_id(db, entreprise_id)
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvee")
    return entreprise


@router.put("/entreprises/{entreprise_id}", response_model=EntrepriseOut)
def update_entreprise_as_super_admin(
    entreprise_id: str,
    entreprise_in: EntrepriseUpdate,
    db: Session = Depends(get_db),
    current_super_admin: UtilisateurOut = Depends(get_current_super_admin),
):
    entreprise = get_entreprise_by_id(db, entreprise_id)
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvee")

    update_data = entreprise_in.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnee de mise a jour fournie")

    return update_entreprise(db, entreprise, update_data)
