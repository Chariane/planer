from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os

from api_gateway.models import Utilisateur, Fichier, Membre
from ..database import get_db
from ..schemas import FichierCreate, FichierOut, FichierUpdate, UtilisateurOut
from ..crud.fichier_crud import (
    get_fichier_by_id, get_fichiers_for_membre, create_fichier, update_fichier, delete_fichier
)
from api_gateway.security import get_current_user

router = APIRouter(prefix="/fichiers", tags=["Fichiers"])


def get_current_user_member_ids(db: Session, user_id: str) -> List[str]:
    return [m.id for m in db.query(Membre).filter(Membre.id_utilisateur == user_id, Membre.statut == 'Actif').all()]


def verify_fichier_access(db: Session, current_user: UtilisateurOut, fichier: Fichier):
    if not fichier:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    if not fichier.id_membre:
        raise HTTPException(status_code=403, detail="Accès refusé au fichier")
    membre = db.query(Membre).filter(Membre.id == fichier.id_membre, Membre.id_utilisateur == current_user.id).first()
    if not membre:
        raise HTTPException(status_code=403, detail="Accès refusé au fichier")
    return fichier

@router.post("", response_model=FichierOut, status_code=status.HTTP_201_CREATED)
def upload_fichier(
    file: UploadFile = File(...),
    id_membre: str = None,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    # Sauvegarder le fichier (exemple simple, à adapter)
    file_path = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    
    member_ids = get_current_user_member_ids(db, current_user.id)
    if id_membre:
        if id_membre not in member_ids:
            raise HTTPException(status_code=403, detail="Accès refusé au membre")
    else:
        if not member_ids:
            raise HTTPException(status_code=403, detail="Aucun membre actif trouvé pour l'utilisateur")
        id_membre = member_ids[0]

    new_fichier = create_fichier(
        db,
        nom=file.filename,
        url_fichier=file_path,
        type_fichier=file.content_type,
        meta_donnees={"taille": file.spool_max_size if hasattr(file, 'spool_max_size') else None},
        id_membre=id_membre
    )
    return new_fichier

@router.get("", response_model=List[FichierOut])
def get_fichiers(
    membre_id: str = None,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    member_ids = get_current_user_member_ids(db, current_user.id)
    if membre_id:
        if membre_id not in member_ids:
            raise HTTPException(status_code=403, detail="Accès refusé au membre")
        fichiers = get_fichiers_for_membre(db, membre_id)
    else:
        if not member_ids:
            return []
        fichiers = db.query(Fichier).filter(Fichier.id_membre.in_(member_ids)).all()
    return fichiers

@router.get("/{fichier_id}", response_model=FichierOut)
def get_fichier(
    fichier_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    fichier = get_fichier_by_id(db, fichier_id)
    return verify_fichier_access(db, current_user, fichier)

@router.put("/{fichier_id}", response_model=FichierOut)
def update_fichier_endpoint(
    fichier_id: str,
    fichier_in: FichierUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    fichier = get_fichier_by_id(db, fichier_id)
    verify_fichier_access(db, current_user, fichier)
    if fichier_in.id_membre is not None:
        member_ids = get_current_user_member_ids(db, current_user.id)
        if fichier_in.id_membre not in member_ids:
            raise HTTPException(status_code=403, detail="Accès refusé au membre")

    fichier = update_fichier(
        db,
        fichier_id,
        nom=fichier_in.nom,
        url_fichier=fichier_in.url_fichier,
        type_fichier=fichier_in.type_fichier,
        meta_donnees=fichier_in.meta_donnees,
        id_membre=fichier_in.id_membre,
    )
    if not fichier:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return fichier

@router.delete("/{fichier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fichier_endpoint(
    fichier_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    if not delete_fichier(db, fichier_id):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return None