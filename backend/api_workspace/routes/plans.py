from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.plans import get_plan_by_code, get_plan_catalog
from ..core.database import get_db
from ..core.security import get_current_user
from ..schemas import SubscriptionPlanCatalogOut
from backend.core.plan_limits import get_plan_usage


router = APIRouter(prefix="/plans", tags=["Plans"])


@router.get("", response_model=list[SubscriptionPlanCatalogOut])
def list_subscription_plans():
    return get_plan_catalog()


@router.get("/{code}", response_model=SubscriptionPlanCatalogOut)
def get_subscription_plan(code: str):
    plan = get_plan_by_code(code)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan introuvable.")
    return plan


@router.get("/me/usage")
def get_my_plan_usage(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_plan_usage(db, current_user.id)
