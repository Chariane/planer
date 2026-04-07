from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..schemas import (
    EntrepriseCreate, EntrepriseOut, EntrepriseUpdate,
    PlanAbonnementCreate, PlanAbonnementOut, PlanAbonnementUpdate,
    AbonnementEntrepriseCreate, AbonnementEntrepriseOut, AbonnementEntrepriseUpdate,
    PaiementAbonnementCreate, PaiementAbonnementOut, PaiementAbonnementUpdate,
    UtilisateurOut
)
from ..crud.planer_crud import (
    get_entreprise_by_id, get_entreprises_for_user, create_entreprise, update_entreprise, delete_entreprise,
    get_plan_abonnement_by_id, get_all_plans_abonnement, create_plan_abonnement, update_plan_abonnement, delete_plan_abonnement,
    get_abonnement_by_id, get_abonnements_for_entreprise, create_abonnement, update_abonnement, delete_abonnement,
    get_paiement_by_id, get_paiements_for_abonnement, create_paiement, update_paiement, delete_paiement
)
from ..security import get_current_user, get_current_admin

router = APIRouter(prefix="/planer", tags=["Planer - Abonnements et Entreprises"])

# Entreprises
@router.post("/entreprises", response_model=EntrepriseOut, status_code=status.HTTP_201_CREATED)
def create_entreprise_endpoint(
    entreprise_in: EntrepriseCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_entreprise = create_entreprise(db, entreprise_in, current_user.id)
    return new_entreprise

@router.get("/entreprises", response_model=List[EntrepriseOut])
def get_entreprises(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    entreprises = get_entreprises_for_user(db, current_user.id)
    return entreprises

@router.get("/entreprises/{entreprise_id}", response_model=EntrepriseOut)
def get_entreprise(
    entreprise_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    entreprise = get_entreprise_by_id(db, entreprise_id)
    if not entreprise or entreprise.id_utilisateur != current_user.id:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return entreprise

@router.put("/entreprises/{entreprise_id}", response_model=EntrepriseOut)
def update_entreprise_endpoint(
    entreprise_id: str,
    entreprise_in: EntrepriseUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    entreprise = update_entreprise(db, entreprise_id, entreprise_in, current_user.id)
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return entreprise

@router.delete("/entreprises/{entreprise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entreprise_endpoint(
    entreprise_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not delete_entreprise(db, entreprise_id, current_user.id):
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return None

# Plans d'abonnement (admin seulement)
@router.post("/plans-abonnement", response_model=PlanAbonnementOut, status_code=status.HTTP_201_CREATED)
def create_plan_abonnement_endpoint(
    plan_in: PlanAbonnementCreate,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    new_plan = create_plan_abonnement(db, plan_in)
    return new_plan

@router.get("/plans-abonnement", response_model=List[PlanAbonnementOut])
def get_plans_abonnement(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    plans = get_all_plans_abonnement(db)
    return plans

@router.get("/plans-abonnement/{plan_id}", response_model=PlanAbonnementOut)
def get_plan_abonnement(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    plan = get_plan_abonnement_by_id(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    return plan

@router.put("/plans-abonnement/{plan_id}", response_model=PlanAbonnementOut)
def update_plan_abonnement_endpoint(
    plan_id: str,
    plan_in: PlanAbonnementUpdate,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    plan = update_plan_abonnement(db, plan_id, plan_in)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    return plan

@router.delete("/plans-abonnement/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan_abonnement_endpoint(
    plan_id: str,
    db: Session = Depends(get_db),
    current_admin: UtilisateurOut = Depends(get_current_admin)
):
    if not delete_plan_abonnement(db, plan_id):
        raise HTTPException(status_code=404, detail="Plan non trouvé")
    return None

# Abonnements entreprise
@router.post("/abonnements", response_model=AbonnementEntrepriseOut, status_code=status.HTTP_201_CREATED)
def create_abonnement_endpoint(
    abonnement_in: AbonnementEntrepriseCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    # Vérifier que l'entreprise appartient à l'utilisateur
    entreprise = get_entreprise_by_id(db, abonnement_in.id_entreprise)
    if not entreprise or entreprise.id_utilisateur != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    new_abonnement = create_abonnement(db, abonnement_in)
    return new_abonnement

@router.get("/abonnements", response_model=List[AbonnementEntrepriseOut])
def get_abonnements(
    entreprise_id: str = None,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if entreprise_id:
        # Vérifier propriété
        entreprise = get_entreprise_by_id(db, entreprise_id)
        if not entreprise or entreprise.id_utilisateur != current_user.id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        abonnements = get_abonnements_for_entreprise(db, entreprise_id)
    else:
        abonnements = db.query(AbonnementEntreprise).filter(AbonnementEntreprise.id_entreprise.in_(
            db.query(Entreprise.id).filter(Entreprise.id_utilisateur == current_user.id)
        )).all()
    return abonnements

@router.get("/abonnements/{abonnement_id}", response_model=AbonnementEntrepriseOut)
def get_abonnement(
    abonnement_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    abonnement = get_abonnement_by_id(db, abonnement_id)
    if not abonnement:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    entreprise = get_entreprise_by_id(db, abonnement.id_entreprise)
    if entreprise.id_utilisateur != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    return abonnement

@router.put("/abonnements/{abonnement_id}", response_model=AbonnementEntrepriseOut)
def update_abonnement_endpoint(
    abonnement_id: str,
    abonnement_in: AbonnementEntrepriseUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    abonnement = get_abonnement_by_id(db, abonnement_id)
    if not abonnement:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    entreprise = get_entreprise_by_id(db, abonnement.id_entreprise)
    if entreprise.id_utilisateur != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    updated_abonnement = update_abonnement(db, abonnement_id, abonnement_in)
    return updated_abonnement

@router.delete("/abonnements/{abonnement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_abonnement_endpoint(
    abonnement_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    abonnement = get_abonnement_by_id(db, abonnement_id)
    if not abonnement:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    entreprise = get_entreprise_by_id(db, abonnement.id_entreprise)
    if entreprise.id_utilisateur != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if not delete_abonnement(db, abonnement_id):
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    return None

# Paiements abonnement
@router.post("/paiements", response_model=PaiementAbonnementOut, status_code=status.HTTP_201_CREATED)
def create_paiement_endpoint(
    paiement_in: PaiementAbonnementCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    # Vérifier que l'abonnement appartient à l'utilisateur
    abonnement = get_abonnement_by_id(db, paiement_in.id_abonnement)
    if not abonnement:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    entreprise = get_entreprise_by_id(db, abonnement.id_entreprise)
    if entreprise.id_utilisateur != current_user.id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    new_paiement = create_paiement(db, paiement_in, current_user.id)
    return new_paiement

@router.get("/paiements", response_model=List[PaiementAbonnementOut])
def get_paiements(
    abonnement_id: str = None,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if abonnement_id:
        # Vérifier propriété
        abonnement = get_abonnement_by_id(db, abonnement_id)
        if not abonnement:
            raise HTTPException(status_code=404, detail="Abonnement non trouvé")
        entreprise = get_entreprise_by_id(db, abonnement.id_entreprise)
        if entreprise.id_utilisateur != current_user.id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        paiements = get_paiements_for_abonnement(db, abonnement_id)
    else:
        paiements = db.query(PaiementAbonnement).filter(PaiementAbonnement.id_utilisateur == current_user.id).all()
    return paiements

@router.get("/paiements/{paiement_id}", response_model=PaiementAbonnementOut)
def get_paiement(
    paiement_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    paiement = get_paiement_by_id(db, paiement_id)
    if not paiement or paiement.id_utilisateur != current_user.id:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    return paiement

@router.put("/paiements/{paiement_id}", response_model=PaiementAbonnementOut)
def update_paiement_endpoint(
    paiement_id: str,
    paiement_in: PaiementAbonnementUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    paiement = get_paiement_by_id(db, paiement_id)
    if not paiement or paiement.id_utilisateur != current_user.id:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    updated_paiement = update_paiement(db, paiement_id, paiement_in)
    return updated_paiement

@router.delete("/paiements/{paiement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paiement_endpoint(
    paiement_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    paiement = get_paiement_by_id(db, paiement_id)
    if not paiement or paiement.id_utilisateur != current_user.id:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    if not delete_paiement(db, paiement_id):
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    return None