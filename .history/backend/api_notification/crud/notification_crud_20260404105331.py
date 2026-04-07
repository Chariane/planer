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

def create_absence(db: Session, type_absence: str, date_debut: str, date_fin: str, duree_demandee_en_jours: int = None, motif: str = None, commentaires: str = None, id_membre: str) -> AbsenceEtConge:
    absence = AbsenceEtConge(
        type_absence=type_absence,
        date_debut=date_debut,
        date_fin=date_fin,
        duree_demandee_en_jours=duree_demandee_en_jours,
        motif=motif,
        commentaires=commentaires,
        id_membre=id_membre
    )
    db.add(absence)
    db.commit()
    db.refresh(absence)
    return absence

def update_absence(db: Session, absence_id: str, type_absence: str = None, date_debut: str = None, date_fin: str = None, duree_demandee_en_jours: int = None, motif: str = None, statut: str = None, commentaires: str = None) -> AbsenceEtConge:
    absence = get_absence_by_id(db, absence_id)
    if absence:
        if type_absence is not None:
            absence.type_absence = type_absence
        if date_debut is not None:
            absence.date_debut = date_debut
        if date_fin is not None:
            absence.date_fin = date_fin
        if duree_demandee_en_jours is not None:
            absence.duree_demandee_en_jours = duree_demandee_en_jours
        if motif is not None:
            absence.motif = motif
        if statut is not None:
            absence.statut = statut
        if commentaires is not None:
            absence.commentaires = commentaires
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