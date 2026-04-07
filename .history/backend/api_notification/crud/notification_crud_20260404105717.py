from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from api_gateway.models import Rapport, AbsenceEtConge

# Rapport CRUD
def get_rapport_by_id(db: Session, rapport_id: str) -> Optional[Rapport]:
    return db.query(Rapport).filter(Rapport.id == rapport_id).first()

def get_rapports_for_membre(db: Session, membre_id: str) -> List[Rapport]:
    return db.query(Rapport).filter(Rapport.id_membre == membre_id).all()

def create_rapport(
    db: Session,
    titre: str,
    realisations: Optional[str] = None,
    difficultes_et_solutions: Optional[str] = None,
    commentaire: Optional[str] = None,
    fichier_joint: Optional[str] = None,
    periode_debut: Optional[datetime] = None,
    periode_fin: Optional[datetime] = None,
    id_membre: Optional[str] = None,
) -> Rapport:
    rapport = Rapport(
        titre=titre,
        realisations=realisations,
        difficultes_et_solutions=difficultes_et_solutions,
        commentaire=commentaire,
        fichier_joint=fichier_joint,
        periode_debut=periode_debut,
        periode_fin=periode_fin,
        id_membre=id_membre,
    )
    db.add(rapport)
    db.commit()
    db.refresh(rapport)
    return rapport

def update_rapport(
    db: Session,
    rapport_id: str,
    titre: Optional[str] = None,
    realisations: Optional[str] = None,
    difficultes_et_solutions: Optional[str] = None,
    commentaire: Optional[str] = None,
    fichier_joint: Optional[str] = None,
    periode_debut: Optional[datetime] = None,
    periode_fin: Optional[datetime] = None,
    id_membre: Optional[str] = None,
) -> Optional[Rapport]:
    rapport = get_rapport_by_id(db, rapport_id)
    if rapport:
        if titre is not None:
            rapport.titre = titre
        if realisations is not None:
            rapport.realisations = realisations
        if difficultes_et_solutions is not None:
            rapport.difficultes_et_solutions = difficultes_et_solutions
        if commentaire is not None:
            rapport.commentaire = commentaire
        if fichier_joint is not None:
            rapport.fichier_joint = fichier_joint
        if periode_debut is not None:
            rapport.periode_debut = periode_debut
        if periode_fin is not None:
            rapport.periode_fin = periode_fin
        if id_membre is not None:
            rapport.id_membre = id_membre
        db.commit()
        db.refresh(rapport)
    return rapport

def delete_rapport(db: Session, rapport_id: str) -> bool:
    rapport = get_rapport_by_id(db, rapport_id)
    if rapport:
        db.delete(rapport)
        db.commit()
        return True
    return False

# Absence Et Conge CRUD
def get_absence_by_id(db: Session, absence_id: str) -> Optional[AbsenceEtConge]:
    return db.query(AbsenceEtConge).filter(AbsenceEtConge.id == absence_id).first()

def get_absences_for_membre(db: Session, membre_id: str) -> List[AbsenceEtConge]:
    return db.query(AbsenceEtConge).filter(AbsenceEtConge.id_membre == membre_id).all()

def create_absence(
    db: Session,
    is_absence: bool = True,
    date_debut: Optional[datetime] = None,
    date_fin: Optional[datetime] = None,
    statut: Optional[str] = None,
    motif: Optional[str] = None,
    is_conge_planifie: bool = False,
    duree_demandee_en_jours: Optional[int] = None,
    conge_interrompu_at: Optional[datetime] = None,
    id_membre: Optional[str] = None,
) -> AbsenceEtConge:
    absence = AbsenceEtConge(
        is_absence=is_absence,
        date_debut=date_debut,
        date_fin=date_fin,
        statut=statut,
        motif=motif,
        is_conge_planifie=is_conge_planifie,
        duree_demandee_en_jours=duree_demandee_en_jours,
        conge_interrompu_at=conge_interrompu_at,
        id_membre=id_membre,
    )
    db.add(absence)
    db.commit()
    db.refresh(absence)
    return absence

def update_absence(
    db: Session,
    absence_id: str,
    is_absence: Optional[bool] = None,
    date_debut: Optional[datetime] = None,
    date_fin: Optional[datetime] = None,
    statut: Optional[str] = None,
    motif: Optional[str] = None,
    is_conge_planifie: Optional[bool] = None,
    duree_demandee_en_jours: Optional[int] = None,
    conge_interrompu_at: Optional[datetime] = None,
    id_membre: Optional[str] = None,
) -> Optional[AbsenceEtConge]:
    absence = get_absence_by_id(db, absence_id)
    if absence:
        if is_absence is not None:
            absence.is_absence = is_absence
        if date_debut is not None:
            absence.date_debut = date_debut
        if date_fin is not None:
            absence.date_fin = date_fin
        if statut is not None:
            absence.statut = statut
        if motif is not None:
            absence.motif = motif
        if is_conge_planifie is not None:
            absence.is_conge_planifie = is_conge_planifie
        if duree_demandee_en_jours is not None:
            absence.duree_demandee_en_jours = duree_demandee_en_jours
        if conge_interrompu_at is not None:
            absence.conge_interrompu_at = conge_interrompu_at
        if id_membre is not None:
            absence.id_membre = id_membre
        db.commit()
        db.refresh(absence)
    return absence

def delete_absence(db: Session, absence_id: str) -> bool:
    absence = get_absence_by_id(db, absence_id)
    if absence:
        db.delete(absence)
        db.commit()
        return True
    return False