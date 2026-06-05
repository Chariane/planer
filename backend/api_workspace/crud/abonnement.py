from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.plans import get_plan_by_code, get_plan_catalog
from ..models import (
    AbonnementEntreprise,
    PaiementAbonnement,
    PlanAbonnement,
    PlanerEntreprise,
    Utilisateur,
)
from ..schemas import EntrepriseCreate, EntrepriseUpdate

ACTIVE_STATUSES = {"Actif", "Active", "actif", "active"}
PENDING_STATUSES = {"En attente", "Pending", "pending"}


def _clean_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def ensure_catalog_plans(db: Session) -> list[PlanAbonnement]:
    rows: list[PlanAbonnement] = []
    for item in get_plan_catalog():
        billing = item.get("billing") or {}
        code = item["code"].upper()
        plan = (
            db.query(PlanAbonnement)
            .filter(func.upper(PlanAbonnement.code) == code)
            .first()
        )
        if not plan:
            plan = PlanAbonnement(
                code=code,
                nom=item["nom"],
                description=item["description"],
                montant=Decimal(str(billing.get("montant", 0))),
                devise=billing.get("devise") or "XOF",
                duree_jours=int(billing.get("duree_jours") or 30),
                is_active=True,
            )
            db.add(plan)
        else:
            plan.nom = item["nom"]
            plan.description = item["description"]
            plan.montant = Decimal(str(billing.get("montant", plan.montant or 0)))
            plan.devise = billing.get("devise") or plan.devise or "XOF"
            plan.duree_jours = int(billing.get("duree_jours") or plan.duree_jours or 30)
            plan.is_active = True
            plan.updated_at = datetime.utcnow()
        rows.append(plan)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def get_plan_or_404(db: Session, plan_code: str) -> PlanAbonnement:
    ensure_catalog_plans(db)
    plan = (
        db.query(PlanAbonnement)
        .filter(func.upper(PlanAbonnement.code) == plan_code.strip().upper(), PlanAbonnement.is_active.is_(True))
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan d'abonnement introuvable.")
    return plan


def get_my_entreprise(db: Session, user_id: str) -> Optional[PlanerEntreprise]:
    return db.query(PlanerEntreprise).filter(PlanerEntreprise.id_utilisateur == user_id).first()


def _set_entreprise_fields(entreprise: PlanerEntreprise, payload: dict) -> None:
    allowed_fields = {
        "nom",
        "description",
        "statut_juridique",
        "adresse",
        "telephone",
        "numero_ifu",
        "numero_rccm",
        "nom_responsable_entreprise",
        "prenoms_responsable_entreprise",
        "telephone_responsable_entreprise",
        "site_web",
        "logo",
        "date_creation_entreprise",
        "statut_compte",
    }
    for field in allowed_fields:
        if field in payload:
            value = payload[field]
            if isinstance(value, str):
                value = _clean_optional_text(value)
            setattr(entreprise, field, value)


def create_my_entreprise(db: Session, user_id: str, entreprise_in: EntrepriseCreate) -> PlanerEntreprise:
    existing = get_my_entreprise(db, user_id)
    if existing:
        raise HTTPException(status_code=409, detail="Vous avez deja une entreprise rattachee a votre compte.")

    payload = entreprise_in.model_dump(exclude_unset=True)
    payload.pop("id_utilisateur", None)
    entreprise = PlanerEntreprise(id_utilisateur=user_id, nom=payload.get("nom"))
    _set_entreprise_fields(entreprise, payload)
    db.add(entreprise)

    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if user:
        user.is_entreprise = True

    db.commit()
    db.refresh(entreprise)
    return entreprise


def update_my_entreprise(db: Session, user_id: str, entreprise_in: EntrepriseUpdate) -> PlanerEntreprise:
    entreprise = get_my_entreprise(db, user_id)
    if not entreprise:
        raise HTTPException(status_code=404, detail="Creez d'abord votre fiche entreprise.")
    payload = entreprise_in.model_dump(exclude_unset=True)
    _set_entreprise_fields(entreprise, payload)
    entreprise.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entreprise)
    return entreprise


def get_active_subscription(db: Session, entreprise_id: str) -> Optional[AbonnementEntreprise]:
    now = datetime.utcnow()
    return (
        db.query(AbonnementEntreprise)
        .filter(
            AbonnementEntreprise.id_entreprise == entreprise_id,
            AbonnementEntreprise.statut.in_(ACTIVE_STATUSES),
            AbonnementEntreprise.date_fin > now,
        )
        .order_by(AbonnementEntreprise.date_fin.desc())
        .first()
    )


def get_pending_subscription(db: Session, entreprise_id: str) -> Optional[AbonnementEntreprise]:
    return (
        db.query(AbonnementEntreprise)
        .filter(
            AbonnementEntreprise.id_entreprise == entreprise_id,
            AbonnementEntreprise.statut.in_(PENDING_STATUSES),
        )
        .order_by(AbonnementEntreprise.created_at.desc())
        .first()
    )


def get_latest_payment(db: Session, abonnement_id: Optional[str]) -> Optional[PaiementAbonnement]:
    if not abonnement_id:
        return None
    return (
        db.query(PaiementAbonnement)
        .filter(PaiementAbonnement.id_abonnement == abonnement_id)
        .order_by(PaiementAbonnement.created_at.desc())
        .first()
    )


def get_subscription_overview(db: Session, user_id: str) -> dict:
    ensure_catalog_plans(db)
    entreprise = get_my_entreprise(db, user_id)
    if not entreprise:
        return {
            "entreprise": None,
            "active_subscription": None,
            "pending_subscription": None,
            "active_plan": None,
            "pending_plan": None,
            "latest_payment": None,
        }

    active_subscription = get_active_subscription(db, entreprise.id)
    pending_subscription = get_pending_subscription(db, entreprise.id)
    chosen_subscription = active_subscription or pending_subscription
    return {
        "entreprise": entreprise,
        "active_subscription": active_subscription,
        "pending_subscription": pending_subscription,
        "active_plan": active_subscription.plan_abonnement if active_subscription else None,
        "pending_plan": pending_subscription.plan_abonnement if pending_subscription else None,
        "latest_payment": get_latest_payment(db, chosen_subscription.id if chosen_subscription else None),
    }


def start_subscription(
    db: Session,
    *,
    user_id: str,
    plan_code: str,
    auto_renouvellement: bool = False,
) -> dict:
    entreprise = get_my_entreprise(db, user_id)
    if not entreprise:
        raise HTTPException(status_code=400, detail="Creez votre fiche entreprise avant de choisir un abonnement.")

    plan = get_plan_or_404(db, plan_code)
    if plan.code.upper() == "ESSENTIEL":
        raise HTTPException(status_code=400, detail="Le plan Essentiel est le plan gratuit par defaut et ne necessite pas d'abonnement entreprise.")

    active_subscription = get_active_subscription(db, entreprise.id)
    if active_subscription and active_subscription.id_plan_abonnement == plan.id:
        raise HTTPException(status_code=409, detail="Cette entreprise utilise deja ce plan.")

    now = datetime.utcnow()
    abonnement = AbonnementEntreprise(
        id_entreprise=entreprise.id,
        id_plan_abonnement=plan.id,
        date_debut=now,
        date_fin=now + timedelta(days=plan.duree_jours),
        statut="En attente",
        auto_renouvellement=auto_renouvellement,
    )
    db.add(abonnement)
    db.flush()

    paiement = PaiementAbonnement(
        id_abonnement=abonnement.id,
        id_utilisateur=user_id,
        montant=plan.montant,
        devise=plan.devise,
        statut="En attente",
    )
    db.add(paiement)
    db.commit()
    db.refresh(abonnement)
    db.refresh(paiement)
    return {"entreprise": entreprise, "abonnement": abonnement, "paiement": paiement, "plan": plan}


def confirm_subscription_payment(
    db: Session,
    *,
    user_id: str,
    abonnement_id: str,
    mode_paiement: Optional[str] = None,
    reference_transaction: Optional[str] = None,
) -> dict:
    entreprise = get_my_entreprise(db, user_id)
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise introuvable.")

    abonnement = (
        db.query(AbonnementEntreprise)
        .filter(AbonnementEntreprise.id == abonnement_id, AbonnementEntreprise.id_entreprise == entreprise.id)
        .first()
    )
    if not abonnement:
        raise HTTPException(status_code=404, detail="Abonnement introuvable pour cette entreprise.")

    now = datetime.utcnow()
    plan = abonnement.plan_abonnement
    if not plan:
        raise HTTPException(status_code=404, detail="Plan associe introuvable.")

    (
        db.query(AbonnementEntreprise)
        .filter(
            AbonnementEntreprise.id_entreprise == entreprise.id,
            AbonnementEntreprise.id != abonnement.id,
            AbonnementEntreprise.statut.in_(ACTIVE_STATUSES),
        )
        .update({"statut": "Expire", "updated_at": now}, synchronize_session=False)
    )

    abonnement.statut = "Actif"
    abonnement.date_debut = now
    abonnement.date_fin = now + timedelta(days=plan.duree_jours)
    abonnement.updated_at = now

    paiement = get_latest_payment(db, abonnement.id)
    if not paiement:
        paiement = PaiementAbonnement(
            id_abonnement=abonnement.id,
            id_utilisateur=user_id,
            montant=plan.montant,
            devise=plan.devise,
        )
        db.add(paiement)

    paiement.mode_paiement = _clean_optional_text(mode_paiement)
    paiement.reference_transaction = _clean_optional_text(reference_transaction)
    paiement.statut = "Paye"
    paiement.paid_at = now

    entreprise.is_premium = True
    entreprise.premium_activated_at = now
    entreprise.premium_expire_at = abonnement.date_fin
    entreprise.updated_at = now

    db.commit()
    db.refresh(entreprise)
    db.refresh(abonnement)
    db.refresh(paiement)
    return {"entreprise": entreprise, "abonnement": abonnement, "paiement": paiement, "plan": plan}
