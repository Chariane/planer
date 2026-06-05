from fastapi import APIRouter, HTTPException

from ..core.plans import get_plan_by_code, get_plan_catalog
from ..schemas import SubscriptionPlanCatalogOut


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
