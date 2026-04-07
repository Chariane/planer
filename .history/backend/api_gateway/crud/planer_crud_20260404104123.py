from sqlalchemy.orm import Session
from ..models import Entreprise, PlanAbonnement, AbonnementEntreprise, PaiementAbonnement
from ..schemas import (
    EntrepriseCreate, EntrepriseUpdate,
    PlanAbonnementCreate, PlanAbonnementUpdate,
    AbonnementEntrepriseCreate, AbonnementEntrepriseUpdate,
    PaiementAbonnementCreate, PaiementAbonnementUpdate
)
from uuid import uuid4
from datetime import datetime

# Entreprise CRUD
def get_entreprise_by_id(db: Session, entreprise_id: str):
    return db.query(Entreprise).filter(Entreprise.id == entreprise_id).first()

def get_entreprises_for_user(db: Session, user_id: str):
    return db.query(Entreprise).filter(Entreprise.id_utilisateur == user_id).all()

def create_entreprise(db: Session, entreprise_in: EntrepriseCreate, user_id: str):
    entreprise = Entreprise(
        id=str(uuid4()),
        nom=entreprise_in.nom,
        description=entreprise_in.description,
        secteur=entreprise_in.secteur,
        taille=entreprise_in.taille,
        id_utilisateur=user_id,
        date_creation=datetime.utcnow()
    )
    db.add(entreprise)
    db.commit()
    db.refresh(entreprise)
    return entreprise

def update_entreprise(db: Session, entreprise_id: str, entreprise_in: EntrepriseUpdate, user_id: str):
    entreprise = db.query(Entreprise).filter(Entreprise.id == entreprise_id, Entreprise.id_utilisateur == user_id).first()
    if not entreprise:
        return None
    for key, value in entreprise_in.dict(exclude_unset=True).items():
        setattr(entreprise, key, value)
    db.commit()
    db.refresh(entreprise)
    return entreprise

def delete_entreprise(db: Session, entreprise_id: str, user_id: str):
    entreprise = db.query(Entreprise).filter(Entreprise.id == entreprise_id, Entreprise.id_utilisateur == user_id).first()
    if not entreprise:
        return False
    db.delete(entreprise)
    db.commit()
    return True

# Plan Abonnement CRUD
def get_plan_abonnement_by_id(db: Session, plan_id: str):
    return db.query(PlanAbonnement).filter(PlanAbonnement.id == plan_id).first()

def get_all_plans_abonnement(db: Session):
    return db.query(PlanAbonnement).all()

def create_plan_abonnement(db: Session, plan_in: PlanAbonnementCreate):
    plan = PlanAbonnement(
        id=str(uuid4()),
        nom=plan_in.nom,
        description=plan_in.description,
        prix_mensuel=plan_in.prix_mensuel,
        prix_annuel=plan_in.prix_annuel,
        fonctionnalites=plan_in.fonctionnalites,
        limite_utilisateurs=plan_in.limite_utilisateurs,
        limite_workspaces=plan_in.limite_workspaces,
        limite_espaces=plan_in.limite_espaces,
        limite_listes=plan_in.limite_listes,
        limite_taches=plan_in.limite_taches,
        limite_fichiers=plan_in.limite_fichiers,
        stockage_max=plan_in.stockage_max,
        actif=plan_in.actif
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

def update_plan_abonnement(db: Session, plan_id: str, plan_in: PlanAbonnementUpdate):
    plan = db.query(PlanAbonnement).filter(PlanAbonnement.id == plan_id).first()
    if not plan:
        return None
    for key, value in plan_in.dict(exclude_unset=True).items():
        setattr(plan, key, value)
    db.commit()
    db.refresh(plan)
    return plan

def delete_plan_abonnement(db: Session, plan_id: str):
    plan = db.query(PlanAbonnement).filter(PlanAbonnement.id == plan_id).first()
    if not plan:
        return False
    db.delete(plan)
    db.commit()
    return True

# Abonnement Entreprise CRUD
def get_abonnement_by_id(db: Session, abonnement_id: str):
    return db.query(AbonnementEntreprise).filter(AbonnementEntreprise.id == abonnement_id).first()

def get_abonnements_for_entreprise(db: Session, entreprise_id: str):
    return db.query(AbonnementEntreprise).filter(AbonnementEntreprise.id_entreprise == entreprise_id).all()

def create_abonnement(db: Session, abonnement_in: AbonnementEntrepriseCreate):
    abonnement = AbonnementEntreprise(
        id=str(uuid4()),
        id_entreprise=abonnement_in.id_entreprise,
        id_plan=abonnement_in.id_plan,
        date_debut=abonnement_in.date_debut,
        date_fin=abonnement_in.date_fin,
        statut=abonnement_in.statut,
        renouvellement_auto=abonnement_in.renouvellement_auto,
        frequence_facturation=abonnement_in.frequence_facturation
    )
    db.add(abonnement)
    db.commit()
    db.refresh(abonnement)
    return abonnement

def update_abonnement(db: Session, abonnement_id: str, abonnement_in: AbonnementEntrepriseUpdate):
    abonnement = db.query(AbonnementEntreprise).filter(AbonnementEntreprise.id == abonnement_id).first()
    if not abonnement:
        return None
    for key, value in abonnement_in.dict(exclude_unset=True).items():
        setattr(abonnement, key, value)
    db.commit()
    db.refresh(abonnement)
    return abonnement

def delete_abonnement(db: Session, abonnement_id: str):
    abonnement = db.query(AbonnementEntreprise).filter(AbonnementEntreprise.id == abonnement_id).first()
    if not abonnement:
        return False
    db.delete(abonnement)
    db.commit()
    return True

# Paiement Abonnement CRUD
def get_paiement_by_id(db: Session, paiement_id: str):
    return db.query(PaiementAbonnement).filter(PaiementAbonnement.id == paiement_id).first()

def get_paiements_for_abonnement(db: Session, abonnement_id: str):
    return db.query(PaiementAbonnement).filter(PaiementAbonnement.id_abonnement == abonnement_id).all()

def create_paiement(db: Session, paiement_in: PaiementAbonnementCreate, user_id: str):
    paiement = PaiementAbonnement(
        id=str(uuid4()),
        id_abonnement=paiement_in.id_abonnement,
        montant=paiement_in.montant,
        devise=paiement_in.devise,
        methode_paiement=paiement_in.methode_paiement,
        statut=paiement_in.statut,
        date_paiement=paiement_in.date_paiement,
        reference_transaction=paiement_in.reference_transaction,
        id_utilisateur=user_id
    )
    db.add(paiement)
    db.commit()
    db.refresh(paiement)
    return paiement

def update_paiement(db: Session, paiement_id: str, paiement_in: PaiementAbonnementUpdate):
    paiement = db.query(PaiementAbonnement).filter(PaiementAbonnement.id == paiement_id).first()
    if not paiement:
        return None
    for key, value in paiement_in.dict(exclude_unset=True).items():
        setattr(paiement, key, value)
    db.commit()
    db.refresh(paiement)
    return paiement

def delete_paiement(db: Session, paiement_id: str):
    paiement = db.query(PaiementAbonnement).filter(PaiementAbonnement.id == paiement_id).first()
    if not paiement:
        return False
    db.delete(paiement)
    db.commit()
    return True