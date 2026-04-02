from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid

from ..models import Membre, Workspace, Espace, Liste, Utilisateur
from ..database import get_db
from ..schemas import FichierCreate, FichierOut, FichierUpdate
from ..security import get_current_user
from ..crud.fichier_crud import (
    get_fichier_by_id,
    get_fichiers_by_workspace,
    get_fichiers_by_espace,
    get_fichiers_by_liste,
    get_fichiers_by_utilisateur,
    create_fichier,
    update_fichier,
    delete_fichier
)

router = APIRouter(prefix="/fichiers", tags=["Fichiers"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_membre_from_context(db: Session, user_id: str, workspace_id: str = None, espace_id: str = None, liste_id: str = None) -> Membre:
    """Retourne un membre de l'utilisateur dans le contexte donné."""
    if workspace_id:
        membre = db.query(Membre).filter(
            Membre.id_workspace == workspace_id,
            Membre.id_utilisateur == user_id
        ).first()
        if not membre:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas membre de ce workspace")
        return membre
    elif espace_id:
        espace = db.query(Espace).filter(Espace.id == espace_id).first()
        if not espace:
            raise HTTPException(status_code=404, detail="Espace non trouvé")
        membre = db.query(Membre).filter(
            Membre.id_workspace == espace.id_workspace,
            Membre.id_utilisateur == user_id
        ).first()
        if not membre:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas membre de l'espace")
        return membre
    elif liste_id:
        liste = db.query(Liste).filter(Liste.id == liste_id).first()
        if not liste:
            raise HTTPException(status_code=404, detail="Liste non trouvée")
        if liste.id_workspace:
            membre = db.query(Membre).filter(
                Membre.id_workspace == liste.id_workspace,
                Membre.id_utilisateur == user_id
            ).first()
        else:
            espace = db.query(Espace).filter(Espace.id == liste.id_espace).first()
            if not espace:
                raise HTTPException(status_code=404, detail="Espace parent non trouvé")
            membre = db.query(Membre).filter(
                Membre.id_workspace == espace.id_workspace,
                Membre.id_utilisateur == user_id
            ).first()
        if not membre:
            raise HTTPException(status_code=403, detail="Vous n'êtes pas membre de la liste")
        return membre
    else:
        raise HTTPException(status_code=400, detail="Il faut préciser une cible (workspace, espace ou liste)")

@router.post("/upload", response_model=FichierOut, status_code=status.HTTP_201_CREATED)
async def upload_fichier(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    workspace_id: Optional[str] = Form(None),
    espace_id: Optional[str] = Form(None),
    liste_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Vérifier qu'une seule cible est fournie
    cibles = [workspace_id, espace_id, liste_id]
    if sum(1 for c in cibles if c) != 1:
        raise HTTPException(status_code=400, detail="Précisez exactement une cible (workspace_id, espace_id ou liste_id)")

    membre = get_membre_from_context(db, current_user.id, workspace_id, espace_id, liste_id)

    # Sauvegarde du fichier
    original_filename = file.filename
    ext = os.path.splitext(original_filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"/uploads/{unique_filename}"
    meta = {"description": description, "taille": file.size} if description else {"taille": file.size}

    new_fichier = create_fichier(
        db,
        nom=original_filename,
        url_fichier=file_url,
        type_fichier=file.content_type or "application/octet-stream",
        meta_donnees=meta,
        id_membre=membre.id
    )
    return new_fichier

@router.get("/workspace/{workspace_id}", response_model=List[FichierOut])
def get_fichiers_for_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Vérifier que l'utilisateur est membre du workspace
    membre = get_membre_from_context(db, current_user.id, workspace_id=workspace_id)
    fichiers = get_fichiers_by_workspace(db, workspace_id)
    return fichiers

@router.get("/espace/{espace_id}", response_model=List[FichierOut])
def get_fichiers_for_espace(
    espace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    membre = get_membre_from_context(db, current_user.id, espace_id=espace_id)
    fichiers = get_fichiers_by_espace(db, espace_id)
    return fichiers

@router.get("/liste/{liste_id}", response_model=List[FichierOut])
def get_fichiers_for_liste(
    liste_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    membre = get_membre_from_context(db, current_user.id, liste_id=liste_id)
    fichiers = get_fichiers_by_liste(db, liste_id)
    return fichiers

@router.get("/mes-fichiers", response_model=List[FichierOut])
def get_my_fichiers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    fichiers = get_fichiers_by_utilisateur(db, current_user.id)
    return fichiers

@router.get("/{fichier_id}", response_model=FichierOut)
def get_fichier(
    fichier_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    fichier = get_fichier_by_id(db, fichier_id)
    if not fichier:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    # Vérifier que l'utilisateur a accès au fichier via son membre
    membre = db.query(Membre).filter(Membre.id == fichier.id_membre).first()
    if not membre:
        raise HTTPException(status_code=404, detail="Membre associé au fichier non trouvé")
    if membre.id_utilisateur != current_user.id:
        # Vérifier si l'utilisateur est admin du workspace ou autre (optionnel)
        # Pour simplifier, on autorise seulement le propriétaire
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ce fichier")
    return fichier

@router.delete("/{fichier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fichier_endpoint(
    fichier_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    fichier = get_fichier_by_id(db, fichier_id)
    if not fichier:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    membre = db.query(Membre).filter(Membre.id == fichier.id_membre).first()
    if not membre or membre.id_utilisateur != current_user.id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres fichiers")
    # Supprimer le fichier physique
    if fichier.url_fichier and os.path.exists(fichier.url_fichier.lstrip('/')):
        os.remove(fichier.url_fichier.lstrip('/'))
    if not delete_fichier(db, fichier_id):
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression")
    return None