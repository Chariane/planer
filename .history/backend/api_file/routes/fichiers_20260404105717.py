from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os

from api_gateway.models import Utilisateur, Fichier
from ..database import get_db
from ..schemas import FichierCreate, FichierOut, FichierUpdate, UtilisateurOut
from ..crud.fichier_crud import (
    get_fichier_by_id, get_fichiers_for_membre, create_fichier, update_fichier, delete_fichier
)
from api_gateway.security import get_current_user

router = APIRouter(prefix="/fichiers", tags=["Fichiers"])

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
    if membre_id:
        fichiers = get_fichiers_for_membre(db, membre_id)
    else:
        # Tous les fichiers, à adapter selon les permissions
        fichiers = db.query(Fichier).all()
    return fichiers

@router.get("/{fichier_id}", response_model=FichierOut)
def get_fichier(
    fichier_id: str,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    fichier = get_fichier_by_id(db, fichier_id)
    if not fichier:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return fichier

@router.put("/{fichier_id}", response_model=FichierOut)
def update_fichier_endpoint(
    fichier_id: str,
    fichier_in: FichierUpdate,
    db: Session = Depends(get_db),
    current_user: UtilisateurOut = Depends(get_current_user)
):
    fichier = update_fichier(db, fichier_id, fichier_in.nom_fichier, fichier_in.chemin_fichier, fichier_in.type_fichier, fichier_in.taille_fichier, fichier_in.id_membre)
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