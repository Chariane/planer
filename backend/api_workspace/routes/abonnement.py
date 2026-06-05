from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import get_current_active_user
from ..crud.abonnement import (
    confirm_subscription_payment,
    create_my_entreprise,
    get_subscription_overview,
    start_subscription,
    update_my_entreprise,
)
from ..schemas import (
    EntrepriseCreate,
    EntrepriseOut,
    EntrepriseSubscriptionOverviewOut,
    EntrepriseUpdate,
    SubscriptionPaymentConfirmRequest,
    SubscriptionStartRequest,
    SubscriptionStartResponse,
    UtilisateurOut,
)

router = APIRouter(prefix="/entreprise", tags=["Entreprise et abonnements"])


@router.get("/me", response_model=EntrepriseSubscriptionOverviewOut)
def get_my_entreprise_overview(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return get_subscription_overview(db, current_user.id)


@router.post("/me", response_model=EntrepriseOut, status_code=status.HTTP_201_CREATED)
def create_my_entreprise_profile(
    entreprise_in: EntrepriseCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return create_my_entreprise(db, current_user.id, entreprise_in)


@router.put("/me", response_model=EntrepriseOut)
def update_my_entreprise_profile(
    entreprise_in: EntrepriseUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return update_my_entreprise(db, current_user.id, entreprise_in)


@router.get("/me/subscription", response_model=EntrepriseSubscriptionOverviewOut)
def get_my_entreprise_subscription(
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return get_subscription_overview(db, current_user.id)


@router.post("/me/subscriptions", response_model=SubscriptionStartResponse, status_code=status.HTTP_201_CREATED)
def start_my_entreprise_subscription(
    subscription_in: SubscriptionStartRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return start_subscription(
        db,
        user_id=current_user.id,
        plan_code=subscription_in.plan_code,
        auto_renouvellement=subscription_in.auto_renouvellement,
    )


@router.post("/me/subscriptions/{abonnement_id}/confirm-payment", response_model=SubscriptionStartResponse)
def confirm_my_entreprise_subscription_payment(
    abonnement_id: str,
    payment_in: SubscriptionPaymentConfirmRequest,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_active_user),
):
    return confirm_subscription_payment(
        db,
        user_id=current_user.id,
        abonnement_id=abonnement_id,
        mode_paiement=payment_in.mode_paiement,
        reference_transaction=payment_in.reference_transaction,
    )
