from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from ..models import PlanerEntreprise, Utilisateur
from ..schemas import EntrepriseCreate, EntrepriseUpdate


def get_entreprise_by_id(db: Session, entreprise_id: str) -> Optional[PlanerEntreprise]:
    return db.query(PlanerEntreprise).filter(PlanerEntreprise.id == entreprise_id).first()


def get_entreprise_by_user_id(db: Session, user_id: str) -> Optional[PlanerEntreprise]:
    return db.query(PlanerEntreprise).filter(PlanerEntreprise.id_utilisateur == user_id).first()


def get_entreprise_by_numero_ifu(db: Session, numero_ifu: Optional[str]) -> Optional[PlanerEntreprise]:
    if not numero_ifu:
        return None
    return db.query(PlanerEntreprise).filter(PlanerEntreprise.numero_ifu == numero_ifu).first()


def get_entreprise_by_numero_rccm(db: Session, numero_rccm: Optional[str]) -> Optional[PlanerEntreprise]:
    if not numero_rccm:
        return None
    return db.query(PlanerEntreprise).filter(PlanerEntreprise.numero_rccm == numero_rccm).first()


def get_all_entreprises(db: Session, skip: int = 0, limit: int = 100) -> List[PlanerEntreprise]:
    return db.query(PlanerEntreprise).offset(skip).limit(limit).all()


def create_entreprise(db: Session, entreprise_in: EntrepriseCreate, user_id: str) -> PlanerEntreprise:
    entreprise_data = entreprise_in.model_dump(exclude={"id_utilisateur"}, exclude_none=True)
    entreprise = PlanerEntreprise(**entreprise_data, id_utilisateur=user_id)

    db.add(entreprise)

    user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    if user:
        user.is_entreprise = True

    db.commit()
    db.refresh(entreprise)
    return entreprise


def update_entreprise(db: Session, entreprise: PlanerEntreprise, entreprise_in: EntrepriseUpdate) -> PlanerEntreprise:
    update_data = entreprise_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entreprise, key, value)

    entreprise.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entreprise)
    return entreprise


def delete_entreprise(db: Session, entreprise: PlanerEntreprise) -> None:
    user = db.query(Utilisateur).filter(Utilisateur.id == entreprise.id_utilisateur).first()
    if user:
        user.is_entreprise = False

    db.delete(entreprise)
    db.commit()
