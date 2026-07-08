from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi_csrf_protect import CsrfProtect
from fastapi import Request

from ..crud.entreprise import (
    create_entreprise,
    delete_entreprise,
    get_entreprise_by_numero_ifu,
    get_entreprise_by_numero_rccm,
    get_entreprise_by_user_id,
    update_entreprise,
)
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..schemas import EntrepriseCreate, EntrepriseOut, EntrepriseUpdate, UtilisateurOut

router = APIRouter(prefix="/entreprise", tags=["Entreprise"])


def _validate_unique_business_identifiers(
    db: Session,
    numero_ifu: Optional[str],
    numero_rccm: Optional[str],
    current_entreprise_id: Optional[str] = None,
) -> None:
    entreprise_ifu = get_entreprise_by_numero_ifu(db, numero_ifu)
    if entreprise_ifu and entreprise_ifu.id != current_entreprise_id:
        raise HTTPException(status_code=400, detail="Ce numero IFU est deja utilise")

    entreprise_rccm = get_entreprise_by_numero_rccm(db, numero_rccm)
    if entreprise_rccm and entreprise_rccm.id != current_entreprise_id:
        raise HTTPException(status_code=400, detail="Ce numero RCCM est deja utilise")


@router.post("", response_model=EntrepriseOut, status_code=status.HTTP_201_CREATED)
async def create_my_entreprise(
    entreprise_in: EntrepriseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
    csrf_protect: CsrfProtect = Depends(),
):
    # ✅ Vérifier CSRF
    await csrf_protect.validate_csrf(request)

    existing_entreprise = get_entreprise_by_user_id(db, current_user.id)
    if existing_entreprise:
        raise HTTPException(status_code=400, detail="Cet utilisateur possede deja une entreprise")

    if current_user.is_entreprise:
        raise HTTPException(
            status_code=409,
            detail="Ce compte est deja marque comme entreprise. Verifiez l'entreprise existante ou contactez un administrateur.",
        )

    _validate_unique_business_identifiers(
        db,
        entreprise_in.numero_ifu,
        entreprise_in.numero_rccm,
    )

    return create_entreprise(db, entreprise_in, current_user.id)


@router.get("/me", response_model=EntrepriseOut)
def get_my_entreprise(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    entreprise = get_entreprise_by_user_id(db, current_user.id)
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvee")
    return entreprise


@router.put("/me", response_model=EntrepriseOut)
async def update_my_entreprise(
    entreprise_in: EntrepriseUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
    csrf_protect: CsrfProtect = Depends(),
):
    # ✅ Vérifier CSRF
    await csrf_protect.validate_csrf(request)

    entreprise = get_entreprise_by_user_id(db, current_user.id)
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvee")

    update_data = entreprise_in.model_dump(exclude_unset=True)
    _validate_unique_business_identifiers(
        db,
        update_data.get("numero_ifu"),
        update_data.get("numero_rccm"),
        current_entreprise_id=entreprise.id,
    )

    return update_entreprise(db, entreprise, entreprise_in)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_entreprise(
    request: Request,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
    csrf_protect: CsrfProtect = Depends(),
):
    # ✅ Vérifier CSRF
    await csrf_protect.validate_csrf(request)

    entreprise = get_entreprise_by_user_id(db, current_user.id)
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvee")

    delete_entreprise(db, entreprise)
    return None
