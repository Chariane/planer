from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from api_gateway.models import Utilisateur, Rapport, AbsenceEtConge
from ..database import get_db
from ..schemas import (
    RapportCreate, RapportOut, RapportUpdate,
    AbsenceEtCongeCreate, AbsenceEtCongeOut, AbsenceEtCongeUpdate,
    UtilisateurOut
)
from ..crud.notification_crud import (
    get_rapport_by_id, get_rapports_for_membre, create_rapport, update_rapport, delete_rapport,
    get_absence_by_id, get_absences_for_membre, create_absence, update_absence, delete_absence
)
from api_gateway.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["Rapports et Absences"])

# Rapports
@router.post("/rapports", response_model=RapportOut, status_code=status.HTTP_201_CREATED)
def create_rapport_endpoint(
    rapport_in: RapportCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_rapport = create_rapport(
        db,
        titre=rapport_in.titre,
        realisations=rapport_in.realisations,
        difficultes_et_solutions=rapport_in.difficultes_et_solutions,
        commentaire=rapport_in.commentaire,
        fichier_joint=rapport_in.fichier_joint,
        periode_debut=rapport_in.periode_debut,
        periode_fin=rapport_in.periode_fin,
        id_membre=rapport_in.id_membre,
    )
    return new_rapport

@router.get("/rapports", response_model=List[RapportOut])
def get_rapports(
    membre_id: str = None,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if membre_id:
        rapports = get_rapports_for_membre(db, membre_id)
    else:
        rapports = db.query(Rapport).all()
    return rapports

@router.get("/rapports/{rapport_id}", response_model=RapportOut)
def get_rapport(
    rapport_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    rapport = get_rapport_by_id(db, rapport_id)
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    return rapport

@router.put("/rapports/{rapport_id}", response_model=RapportOut)
def update_rapport_endpoint(
    rapport_id: str,
    rapport_in: RapportUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    rapport = update_rapport(
        db,
        rapport_id,
        titre=rapport_in.titre,
        realisations=rapport_in.realisations,
        difficultes_et_solutions=rapport_in.difficultes_et_solutions,
        commentaire=rapport_in.commentaire,
        fichier_joint=rapport_in.fichier_joint,
        periode_debut=rapport_in.periode_debut,
        periode_fin=rapport_in.periode_fin,
        id_membre=rapport_in.id_membre,
    )
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    return rapport

@router.delete("/rapports/{rapport_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rapport_endpoint(
    rapport_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not delete_rapport(db, rapport_id):
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    return None

# Absences et Congés
@router.post("/absences", response_model=AbsenceEtCongeOut, status_code=status.HTTP_201_CREATED)
def create_absence_endpoint(
    absence_in: AbsenceEtCongeCreate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    new_absence = create_absence(
        db, absence_in.type_absence, absence_in.date_debut, absence_in.date_fin,
        absence_in.duree_demandee_en_jours, absence_in.motif, absence_in.commentaires, absence_in.id_membre
    )
    return new_absence

@router.get("/absences", response_model=List[AbsenceEtCongeOut])
def get_absences(
    membre_id: str = None,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if membre_id:
        absences = get_absences_for_membre(db, membre_id)
    else:
        absences = db.query(AbsenceEtConge).all()
    return absences

@router.get("/absences/{absence_id}", response_model=AbsenceEtCongeOut)
def get_absence(
    absence_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    absence = get_absence_by_id(db, absence_id)
    if not absence:
        raise HTTPException(status_code=404, detail="Absence non trouvée")
    return absence

@router.put("/absences/{absence_id}", response_model=AbsenceEtCongeOut)
def update_absence_endpoint(
    absence_id: str,
    absence_in: AbsenceEtCongeUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    absence = update_absence(db, absence_id, absence_in.type_absence, absence_in.date_debut, absence_in.date_fin, absence_in.duree_demandee_en_jours, absence_in.motif, absence_in.statut, absence_in.commentaires)
    if not absence:
        raise HTTPException(status_code=404, detail="Absence non trouvée")
    return absence

@router.delete("/absences/{absence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_absence_endpoint(
    absence_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not delete_absence(db, absence_id):
        raise HTTPException(status_code=404, detail="Absence non trouvée")
    return None